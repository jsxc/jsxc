import Dialog from '../Dialog';
import { IContact } from '../../Contact.interface';
import Translation from '@util/Translation';
import { Presence } from '@connection/AbstractConnection';
import Color from '@util/Color';

let vcardTemplate = require('../../../template/vcard.hbs');
let vcardBodyTemplate = require('../../../template/vcard-body.hbs');

let dialog: Dialog;

export default function (contact: IContact) {
   let resources = contact.getResources();
   let basicData = resources.map(resource => {
      let presence = Presence[contact.getPresence(resource)];

      return {
         resource,
         client: Translation.t('loading'),
         presence: Translation.t(presence),
      };
   });

   let content = vcardTemplate({
      jid: contact.getJid().bare,
      name: contact.getName(),
      basic: basicData,
   });

   dialog = new Dialog(content);
   dialog.open();

   let groups = contact.getGroups();
   dialog
      .getDom()
      .find('.jsxc-vcard-tags')
      .append(
         groups.map(group => {
            let element = $('<span>');

            element.text(group);
            element.addClass('jsxc-tag');
            element.css('background-color', Color.generate(group));

            return element;
         })
      );

   for (let resource of resources) {
      let clientElement = dialog.getDom().find(`[data-resource="${resource}"] .jsxc-client`);

      contact
         .getCapabilitiesByResource(resource)
         .then(discoInfo => {
            if (discoInfo) {
               let identities = discoInfo.getIdentities();

               for (let identity of identities) {
                  if (identity && identity.category === 'client') {
                     clientElement.text(`${identity.name} (${identity.type})`);

                     return;
                  }
               }
            }

            return Promise.reject();
         })
         .catch(() => {
            clientElement.text(Translation.t('not_available'));
         });
   }

   contact
      .getVcard()
      .then(vcardSuccessCallback)
      .then(function (vcardData) {
         let content = vcardBodyTemplate({
            properties: vcardData,
         });

         dialog.getDom().append(content);

         dialog.getDom().find('.jsxc-waiting').remove();
      })
      .catch(vcardErrorCallback);
}

function vcardSuccessCallback(vCardData): Promise<any> {
   let dialogElement = dialog.getDom();

   if (vCardData.PHOTO) {
      let imageElement = $('<div>');
      imageElement.addClass('jsxc-avatar jsxc-vcard');
      imageElement.css('background-image', `url(${vCardData.PHOTO.src})`);

      dialogElement.find('h3').before(imageElement);
   }

   let numberOfProperties = Object.keys(vCardData).length;

   if (numberOfProperties === 0 || (numberOfProperties === 1 && vCardData.PHOTO)) {
      return Promise.reject({});
   }

   delete vCardData.PHOTO;

   return Promise.resolve(convertToTemplateData(vCardData));
}

function vcardErrorCallback() {
   let dialogElement = dialog.getDom();

   dialogElement.find('.jsxc-waiting').remove();

   let content = '<p>';
   content += Translation.t('Sorry_your_buddy_doesnt_provide_any_information');
   content += '</p>';

   dialogElement.append(content);
}

function convertToTemplateData(vCardData): any[] {
   let properties = [];

   for (let name in vCardData) {
      let value = vCardData[name];
      let childProperties = [];

      if (typeof value === 'object' && value !== null) {
         childProperties = convertToTemplateData(value);
         value = undefined;
      }

      let nameLabel: string;

      if (Array.isArray(vCardData)) {
         let firstChildProperty = childProperties.shift();

         nameLabel = firstChildProperty?.name;
      } else {
         nameLabel = Translation.t(name);
      }

      properties.push({
         name: nameLabel,
         value,
         properties: childProperties.filter(property => property.value || property.properties.length > 0),
      });
   }

   return properties;
}
