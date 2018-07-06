import Dialog from '../Dialog'
import { IContact } from '../../Contact.interface'

let vcardTemplate = require('../../../template/vcard.hbs');
let vcardBodyTemplate = require('../../../template/vcard-body.hbs');

let dialog: Dialog;

export default function(contact: IContact) {

   let basicData = [];

   let content = vcardTemplate({
      name: contact.getName(),
      basic: basicData
   });

   dialog = new Dialog(content);
   dialog.open();

   contact.getVcard()
      .then(vcardSuccessCallback)
      .then(function(vcardData) {
         let content = vcardBodyTemplate({
            properties: vcardData
         });

         dialog.getDom().append(content);

         dialog.getDom().find('.jsxc-waiting').remove();
      })
      .catch(vcardErrorCallback);
}

function vcardSuccessCallback(vCardData): Promise<any> {
   let dialogElement = dialog.getDom();

   dialogElement.find('p').remove();

   if (vCardData.PHOTO) {
      var img_el = $('<img class="jsxc-vcard" alt="avatar" />');
      img_el.attr('src', vCardData.PHOTO.src);

      dialogElement.find('h3').before(img_el);
   }

   let numberOfProperties = Object.keys(vCardData).length;

   if (numberOfProperties === 0 || (numberOfProperties === 1 && vCardData.PHOTO)) {
      return Promise.reject({});;
   }

   delete vCardData.PHOTO;

   return Promise.resolve(convertToTemplateData(vCardData));
}

function vcardErrorCallback() {
   let dialogElement = dialog.getDom();

   dialogElement.find('.jsxc-dialog p').remove();

   var content = '<p>';
   content += 'Sorry_your_buddy_doesnt_provide_any_information';
   content += '</p>';

   dialogElement.find('.jsxc-dialog').append(content);
}

function convertToTemplateData(vCardData): any[] {
   let properties = [];

   for (let name in vCardData) {
      let value = vCardData[name];
      let childProperties;

      if (typeof value === 'object' && value !== null) {
         childProperties = convertToTemplateData(value);
         value = undefined;
      }

      properties.push({
         name: name,
         value: value,
         properties: childProperties
      });
   }

   return properties;
}
