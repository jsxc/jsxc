import Dialog from '../Dialog'
import Device from '../../plugins/omemo/lib/Device'

let omemoDeviceListTemplate = require('../../../template/dialogOmemoDeviceList.hbs');
let omemoDeviceItemTemplate = require('../../../template/dialogOmemoDeviceItem.hbs');

export default function(peerDevices, ownDevices) {
   let content = omemoDeviceListTemplate();

   let dialog = new Dialog(content);
   let dom = dialog.open();

   insertDevices(peerDevices, dom.find('.jsxc-omemo-peerdevices'));
   insertDevices(ownDevices, dom.find('.jsxc-omemo-owndevices'));

}

async function insertDevices(devices, listElement) {
   for (let device of devices) {
      //@TODO show spinner
      let properties = await getDeviceProperties(device);
      let element = $(omemoDeviceItemTemplate(properties));

      attachActionHandler(element, device);

      listElement.append(element);
   }
}

async function getDeviceProperties(device) {
   let trust = device.getTrust();
   let fingerprint = await device.loadFingerprint();

   return {
      id: device.getId(),
      isCurrentDevice: device.isCurrentDevice(),
      fingerprint: fingerprint,
      trust: Device.Trust[trust],
      trustIsUnknownOrRecognized: trust === Device.Trust.unknown || trust === Device.Trust.recognized,
      trustIsUnknown: trust === Device.Trust.unknown,
   };
};

function attachActionHandler(deviceElement, device) {
   deviceElement.find('.jsxc-omemo-device-action a').click(function() {
      actionHandler(deviceElement, $(this), device);
   });
}

function actionHandler(deviceElement, actionElement, device) {
   let action = actionElement.attr('data-action');

   if (action === 'verify') {
      device.setTrust(Device.Trust.confirmed);
   } else if (action === 'recognize') {
      device.setTrust(Device.Trust.recognized);
   } else {
      console.warn('Unknown action');
      return;
   }

   let trustElement = deviceElement.find('.jsxc-omemo-device-trust');
   let trust = device.getTrust();
   let trustString = Device.Trust[trust];

   trustElement.attr('data-trust', trustString);

   if (trust === Device.Trust.confirmed) {
      deviceElement.find('.jsxc-omemo-device-action a').hide();
   } else if (trust === Device.Trust.recognized) {
      deviceElement.find('.jsxc-omemo-device-action [data-action="recognize"]').hide();
   } else {
      deviceElement.find('.jsxc-omemo-device-action a').show();
   }

   trustElement.text(trustString);
}
