import Dialog from '../Dialog';
import { IContact } from '../../Contact.interface';
import Translation from '@util/Translation';
import { Presence } from '@connection/AbstractConnection';
import Color from '@util/Color';
import MultiUserContact from '@src/MultiUserContact';
import Avatar from '@src/Avatar';
import AvatarUI from '@src/ui/AvatarSet';
import Hash from '@util/Hash';
import { IAvatar } from '@src/Avatar.interface';

let vcardTemplate = require('../../../template/vcard.hbs');
let vcardBodyTemplate = require('../../../template/vcard-body.hbs');

let dialog: Dialog;

export default function (contact: IContact) {
   let resources = contact.getResources();
   let basicData = resources.map(resource => {
      let presence = Presence[contact.getPresence(resource)];

      return {
         resourcetype: contact.isGroupChat() ? Translation.t('Nickname') : Translation.t('Resource'),
         resource,
         client: Translation.t('loading'),
         presence: Translation.t(presence),
      };
   });

   let roominfos = contact.isGroupChat() ? getRoomInfos(<MultiUserContact>contact) : undefined;

   let content = vcardTemplate({
      jid: contact.getJid().bare,
      name: contact.getName(),
      basic: basicData,
      roomfeatures: roominfos,
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
            clientElement.text(Translation.t('Not_available'));
         });
   }

   contact
      .getVcard()
      .then((vcard: any) => {
         if (vcard.PHOTO) {
            let avatar: IAvatar = new Avatar(
               Hash.SHA1FromBase64((<any>vcard.PHOTO).src),
               (<any>vcard.PHOTO).type,
               (<any>vcard.PHOTO).src
            );
            let hash = avatar.getHash();

            let storedHash = contact.getAccount().getStorage().getItem(contact.getJid().bare);
            if (storedHash === undefined || hash !== storedHash) {
               let avatarUI = AvatarUI.get(contact);
               contact.getAccount().getStorage().setItem(contact.getJid().bare, hash);
               avatarUI.reload();
            }
         }
         return Promise.resolve(vcardSuccessCallback(vcard));
      })
      .then(function (vcardData) {
         let content = $(
            vcardBodyTemplate({
               properties: !contact.isGroupChat() ? vcardData : undefined,
            })
         );

         content.addClass('jsxc-vcard-data');
         dialog.getDom().append(content);

         dialog.getDom().find('.jsxc-waiting').remove();
      })
      .catch(vcardErrorCallback);
}

function getRoomInfos(contact: MultiUserContact, first: boolean = true): any[] {
   let result = [];
   if (contact.getSubject() && contact.getSubject().length > 0) {
      result.push({ label: Translation.t('subject'), description: contact.getSubject() });
   }
   for (let item of contact.getFeatures()) {
      let itemname = 'muc_' + item;
      result.push({
         label: '> ',
         description: Translation.t(`${itemname}.keyword`) + ' (' + Translation.t(`${itemname}.description`) + ')',
      });
   }
   if (result.length === 0 && first) {
      let refresh = async function () {
         await (<MultiUserContact>contact).refreshFeatures();
      };
      refresh();
      result = getRoomInfos(contact, false);
   }
   return result;
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
   let result = convertToTemplateData(vCardData);
   if (result !== undefined && result !== null && result.length > 0) {
      return Promise.resolve(result);
   } else {
      return Promise.resolve([]);
   }
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
