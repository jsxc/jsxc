import Dialog from '../Dialog'
import Device, { Trust } from '../../plugins/omemo/lib/Device'
import { IContact } from '../../Contact.interface'
import Omemo from '../../plugins/omemo/lib/Omemo';
import IdentityManager from 'plugins/omemo/lib/IdentityManager';
import DateTime from '@ui/util/DateTime';
import Translation from '@util/Translation';
import Log from '@util/Log';

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

      if (ownDevices.length > 1) {
         addCleanUpAction(omemo, dom);
      }
   });
}

function addCleanUpAction(omemo: Omemo, dom: JQuery) {
   let buttonElement = $('<button>');
   buttonElement.addClass('jsxc-button jsxc-button--default')
   buttonElement.text(Translation.t('Clean_up_own_devices'));
   buttonElement.click((ev) => {
      ev.preventDefault();

      omemo.cleanUpDeviceList().then(localDeviceId => {
         dom.find('.jsxc-omemo-owndevices').children().not(`[data-device-id="${localDeviceId}"]`).remove();
      });
   });
   buttonElement.appendTo(dom);

   let explanationElement = $('<p>');
   explanationElement.addClass('jsxc-hint');
   explanationElement.text(Translation.t('omemo-clean-up-explanation'));
   explanationElement.appendTo(dom);
}

async function insertDevices(devices: Device[], identityManager: IdentityManager, listElement) {
   if (devices.length === 0) {
      listElement.empty().append($('<p>').text(Translation.t('No_devices_available')));

      return;
   }

   for (let device of devices) {
      //@TODO show spinner
      let properties = await getDeviceProperties(device, identityManager);
      let element = $(omemoDeviceItemTemplate(properties));

      let lastUsedElement = element.find('.jsxc-omemo-device-last-used');

      if (properties.lastUsed) {
         DateTime.stringify(properties.lastUsed.getTime(), lastUsedElement);
      } else {
         lastUsedElement.text(Translation.t('never'));
      }

      attachActionHandler(element, device);

      listElement.append(element);
   }
}

async function getDeviceProperties(device: Device, identityManager: IdentityManager) {
   let trust = device.getTrust();
   let fingerprint: string;
   let showControls = !device.isCurrentDevice();

   try {
      fingerprint = await identityManager.loadFingerprint(device.getAddress());

      if (device.isDisabled()) {
         device.enable();
      }
   } catch (err) {
      Log.warn('Error while retrieving fingerprint', err);

      device.disable();

      trust = Trust.ignored;
      fingerprint = 'Not available';
      showControls = false;
   }

   return {
      id: device.getId(),
      isCurrentDevice: device.isCurrentDevice(),
      fingerprint,
      trust: Trust[trust],
      lastUsed: device.getLastUsed(),
      showControls
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
   } else if (action === 'ignore') {
      device.setTrust(Trust.ignored);
   } else {
      Log.warn('Unknown action');

      return;
   }

   let trustElement = deviceElement.find('.jsxc-omemo-device-trust');
   let trust = device.getTrust();
   let trustString = Trust[trust];

   trustElement.attr('data-trust', trustString);

   trustElement.text(trustString);
}
