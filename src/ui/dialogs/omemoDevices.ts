import Dialog from '../Dialog'
import Device, { Trust } from '../../plugins/omemo/lib/Device'
import { IContact } from '../../Contact.interface'
import Omemo from '../../plugins/omemo/lib/Omemo';
import IdentityManager from 'plugins/omemo/lib/IdentityManager';

let omemoDeviceListTemplate = require('../../../template/dialogOmemoDeviceList.hbs');
let omemoDeviceItemTemplate = require('../../../template/dialogOmemoDeviceItem.hbs');

export default function(contact: IContact, omemo: Omemo) {
   let content = omemoDeviceListTemplate();

   let dialog = new Dialog(content);
   let dom = dialog.open();

   omemo.prepare().then(() => {
      let identityManager = omemo.getIdentityManager();
      let peerDevices = omemo.getDevices(contact);
      let ownDevices = omemo.getDevices();

      dom.find('.jsxc-omemo-peerdevices, .jsxc-omemo-owndevices').empty();

      insertDevices(peerDevices, identityManager, dom.find('.jsxc-omemo-peerdevices'));
      insertDevices(ownDevices, identityManager, dom.find('.jsxc-omemo-owndevices'));
   });
}

async function insertDevices(devices: Device[], identityManager: IdentityManager, listElement) {
   for (let device of devices) {
      //@TODO show spinner
      let properties = await getDeviceProperties(device, identityManager);
      let element = $(omemoDeviceItemTemplate(properties));

      attachActionHandler(element, device);

      listElement.append(element);
   }
}

async function getDeviceProperties(device: Device, identityManager: IdentityManager) {
   let trust = device.getTrust();
   let fingerprint = await identityManager.loadFingerprint(device.getAddress());

   return {
      id: device.getId(),
      isCurrentDevice: device.isCurrentDevice(),
      fingerprint: fingerprint,
      trust: Trust[trust],
      trustIsUnknownOrRecognized: trust === Trust.unknown || trust === Trust.recognized,
      trustIsUnknown: trust === Trust.unknown,
   };
};

function attachActionHandler(deviceElement, device: Device) {
   deviceElement.find('.jsxc-omemo-device-action a').click(function() {
      actionHandler(deviceElement, $(this), device);
   });
}

function actionHandler(deviceElement, actionElement, device: Device) {
   let action = actionElement.attr('data-action');

   if (action === 'verify') {
      device.setTrust(Trust.confirmed);
   } else if (action === 'recognize') {
      device.setTrust(Trust.recognized);
   } else {
      console.warn('Unknown action');
      return;
   }

   let trustElement = deviceElement.find('.jsxc-omemo-device-trust');
   let trust = device.getTrust();
   let trustString = Trust[trust];

   trustElement.attr('data-trust', trustString);

   if (trust === Trust.confirmed) {
      deviceElement.find('.jsxc-omemo-device-action a').hide();
   } else if (trust === Trust.recognized) {
      deviceElement.find('.jsxc-omemo-device-action [data-action="recognize"]').hide();
   } else {
      deviceElement.find('.jsxc-omemo-device-action a').show();
   }

   trustElement.text(trustString);
}
