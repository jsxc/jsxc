import Dialog from '../Dialog'
import AvatarPEPPlugin from '../../plugins/pepavatar/AvatarPEPPlugin'
import ImageData from '../../plugins/pepavatar/ImageData'
import Client from '../../Client'
import JID from '../../JID'
import * as sha1 from 'js-sha1'

let pepavatarTemplate = require('../../../template/pepavatar.hbs');

let dialog: Dialog;
let base64data : string;
let mimetype : string;
let size : string;
let height: string;
let width: string;
let hash: string;

export default function() {

   let content = pepavatarTemplate();

   dialog = new Dialog(content);
   let dom = dialog.open();

   $(dom).ready(function(){
    $('#avatarupload').click(function(){
      $(this).val('');
    });

    $('#avatarupload').change(function(event){
      let file = (<HTMLInputElement>document.getElementById('avatarupload')).files[0];
      handleFileSelect(file);
    });
  });
  let account = Client.getAccountManager().getAccounts()[0];
  let contact = account.getContact();
  let jid = contact.getJid().toString();
  contact.getAvatar().then((avatar) => {
         $('#avatarimage').attr('src',avatar.getData());
     $('#avatarimage').css('display','');
      }).catch((msg) => {

     AvatarPEPPlugin.getAvatarFromPEP( account.getConnection(), new JID(jid)).then((avatar) => {
       let result = (<ImageData>avatar);
       $('#avatarimage').attr('src',result.getData());
       $('#avatarimage').css('display','');
      }).catch((msg2) => {
      $('#avatarimage').css('display','none');
      }).then(() => {

      });

      }).then(() => {

      });

   dom.find('form').submit(onSubmit);

   $('.jsxc-js-clear').on('click',removeAvatar);
}

function handleFileSelect(file) {

  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('The File APIs are not fully supported in this browser.');
    return;
  }

  let fr = new FileReader();
  fr.onload = receivedData;
  //fr.readAsBinaryString(file)
  fr.readAsDataURL(file);
}

function receivedData(result) {

  let img = (<HTMLImageElement>document.getElementById('avatarimage'));

   img.onload = function() {
    let canvas = (<HTMLCanvasElement>document.getElementById('canvas'));
    let ctx = canvas.getContext('2d');

    let h = img.width<img.height?192*(img.height/img.width):192;
    let w = img.width>=img.height?192*(img.width/img.height):192;

    canvas.height = h;
    canvas.width =  w;
    ctx.drawImage(img, 0, 0, w, h);

    height = h.toString();
    width  = w.toString();

    // SEND THIS DATA TO WHEREVER YOU NEED IT
    let dataurl = canvas.toDataURL('image/png',0.7);
    base64data=dataurl.substring(dataurl.indexOf('base64,')+7);

    mimetype=dataurl.substring(5,dataurl.indexOf(';',6));
    hash = calculateHash(dataurl);
    let data=atob(base64data);
    size=data.length.toString();

    $(img).attr('src', dataurl);//converted image in variable 'data'*/
    img.onload=null;
    img.width=canvas.width;
    img.height=canvas.height;
    $(img).attr('style', 'min-height:'+height+'px !important; min-width:'+width+
    'px !important; max-height:'+height+'px !important; max-width:'+width+'px !important; height:'+height+'px !important; width:'+width+'px !important;');

    $(img).css('display','');
  }
  img.src = result.target.result;
}

function removeAvatar()
{
    let account = Client.getAccountManager().getAccounts()[0];
    AvatarPEPPlugin.removeAvatar(account.getConnection());

    dialog.close();
}

function onSubmit(ev) {
   ev.preventDefault();

   let account = Client.getAccountManager().getAccounts()[0];
   AvatarPEPPlugin.setAvatar(account.getConnection(),hash,base64data, height, width, mimetype, size);

   dialog.close();
}

function calculateHash(data: string): string {
  let base64 = data.replace(/^.+;base64,/, '');
  let buffer = base64ToArrayBuffer(base64);

  return sha1(buffer);
}

function base64ToArrayBuffer(base64String) {
  let binaryString = window.atob(base64String);
  let bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}