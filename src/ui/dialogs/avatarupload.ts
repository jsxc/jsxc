import Dialog from '../Dialog'
import Client from '../../Client'
import Attachment from '../../Attachment'

let avatarUploadTemplate = require('../../../template/avatarUploadTemplate.hbs');

let dialog: Dialog;
let base64data : string;
let mimetype : string;

let account;

export default function() {

   let content = avatarUploadTemplate();

   dialog = new Dialog(content);
   let dom = dialog.open();

   let accounts = Client.getAccountManager().getAccounts();
   for (let i=0;i<accounts.length;i++){
       let accountoption = $('<option value="'+i+'">'+accounts[i].getUid()+'</option>');
       dialog.getDom().find('select[name="account"]').append(accountoption);
   }

   dialog.getDom().find('select[name="account"]').change((e)=>{
       let val = parseInt($(e.target).val().toString(), 10);
       account=accounts[val];
       loadAvatar(account,dialog);
   });

   dialog.getDom().find('button.jsxc-button.jsxc-avataruploadbutton').click((e)=>{
       showFileSelectionDialog();
   });

   account=accounts[0];
   loadAvatar(account,dialog);

   dom.find('form').submit(onSubmit);

   $('.jsxc-js-clear').on('click',removeAvatar);
}

function showFileSelectionDialog() {

      let fileElement = $('<input type="file">');

      // open file selection for user
      fileElement.click();

      fileElement.off('change').change((ev) => {
         let file: File = (<any>ev.target).files[0]; // FileList object

         if (!file) {
            return;
         }
         let attachment = new Attachment(file);

         attachment.getDataFromFile().then((data)=>{
             attachment.scaleDown(data,0.9,96).then((thumb)=>{
                $('.jsxc-avatarimage > img').attr('src',thumb);

                base64data=thumb.split(';')[1].substring(7);
                mimetype=thumb.split(';')[0].substring(5);
             });
         });
      });
   }

function loadAvatar(account,dialog)
{
    account.getContact().getVcard().then(function(vcardData) {
       let data = (vcardData as any);
       if (data.hasOwnProperty('PHOTO'))
       {
          $('.jsxc-avatarimage > img').attr('src',data.PHOTO.src);
          $('.jsxc-avatarimage > img').css('display','');
       }
    });
}


function removeAvatar() {

   return account.getConnection().getVcardService().setAvatar(account.getJID(),null,null).then(() =>{
       dialog.close();
   });
}

function onSubmit(ev) {
   ev.preventDefault();

   return account.getConnection().getVcardService().setAvatar(account.getJID(),base64data,mimetype).then(() =>{
       dialog.close();
   });
}
