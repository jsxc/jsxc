import Dialog from '../Dialog';
import Client from '../../Client';
import ImageHelper from '@util/ImageHelper';
import FileHelper from '@util/FileHelper';
import { IAvatar } from '@src/Avatar.interface';
import Avatar from '@src/Avatar';
import Hash from '@util/Hash';

const avatarUploadTemplate = require('../../../template/avatarUploadTemplate.hbs');
const placeholderImage = require('../../../images/icons/placeholder.svg').default;

export default function () {
   let content = avatarUploadTemplate();

   let dialog = new Dialog(content);
   let dom = dialog.open();

   let accounts = Client.getAccountManager().getAccounts();

   accounts.forEach(account => {
      let optionElement = $('<option>');
      optionElement.val(account.getUid());
      optionElement.text(account.getUid());

      dialog.getDom().find('select[name="account"]').append(optionElement);
   });

   dialog
      .getDom()
      .find('select[name="account"]')
      .on('change', ev => {
         let uid = $(ev.target).val().toString();
         let avatar: IAvatar;

         const account = Client.getAccountManager().getAccount(uid);

         const fileSelected = (file: File) => {
            dom.find('.jsxc-js-submit').prop('disabled', false);
            dom.find('.jsxc-js-clear').show();

            FileHelper.getDataURLFromFile(file).then(data => {
               ImageHelper.scaleDown(data, 0.9, 96).then(thumb => {
                  $('.jsxc-avatarimage img').attr('src', thumb);

                  const mimetype = file.type;
                  const data = thumb.replace(/^.+;base64,/, '').replace(/[\t\r\n\f ]/gi, '');
                  const hash = Hash.SHA1FromBase64(data);

                  avatar = new Avatar(hash, mimetype, thumb);
               });
            });
         };

         account
            .getContact()
            .getAvatar()
            .then(avatar => {
               dom.find('.jsxc-avatarimage img').attr('src', avatar.getData());
            })
            .catch(() => {
               dom.find('.jsxc-avatarimage img').attr('src', placeholderImage);
               dom.find('.jsxc-js-clear').hide();
            });

         dom.find('.jsxc-avatarimage')
            .off('drop')
            .on('drop', ev => {
               ev.preventDefault();

               let files = (<any>ev.originalEvent).dataTransfer.files;

               if (files && files.length) {
                  fileSelected(files[0]);
               }
            });

         dom.find('input[type="file"]')
            .off('change')
            .on('change', ev => {
               let file: File = (<any>ev.target).files[0];

               if (!file) {
                  return;
               }

               fileSelected(file);
            });

         dom.find('form')
            .off('submit')
            .on('submit', ev => {
               ev.preventDefault();

               account.updateAvatar(avatar).then(() => {
                  dialog.close();
               });
            });

         dom.find('.jsxc-js-clear')
            .off('click')
            .on('click', ev => {
               ev.preventDefault();

               dom.find('.jsxc-avatarimage img').attr('src', placeholderImage);
               dom.find('.jsxc-js-submit').prop('disabled', false);
               dom.find('.jsxc-js-clear').hide();

               avatar = null;
            });
      });

   dialog.getDom().find('select[name="account"]').trigger('change');
}
