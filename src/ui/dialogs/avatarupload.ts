import Dialog from '../Dialog'
import Client from '../../Client'

let avatarUploadTemplate = require('../../../template/avatarUploadTemplate.hbs');

let dialog: Dialog;
let base64data : string;
let mimetype : string;

let height: string;
let width: string;

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
       let val = Number($(e.target).val());
       account=accounts[val];
       loadAvatar(account,dialog);
   });

   console.log(mimetype);

   $('.jsxc-avataruploadinput').change(function(event){
        let file = (<HTMLInputElement>$('.jsxc-avataruploadinput')[0]).files[0];
        handleFileSelect(file);
   });

  account=accounts[0];
  loadAvatar(account,dialog);

  dom.find('form').submit(onSubmit);

  $('.jsxc-js-clear').on('click',removeAvatar);
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

  let img =  <HTMLImageElement>$('.jsxc-avatarimage > img')[0];
  $(img).css('height', '100%');
  $(img).css('width', '100%');

  img.onload = function() {

    //https://xmpp.org/extensions/xep-0153.html#bizrules-image
    //scale down to 192px
    let result = scaleDownTo9kb(img, 192);

    height = result.height.toString();
    width  = result.width.toString();

    base64data=result.base64;
    mimetype=result.type;

    $(img).attr('src', 'data:'+mimetype+';base64,'+base64data);
    img.onload=null;
    img.width=result.width;
    img.height=result.height;
    $(img).css('min-height', height);
    $(img).css('min-width', width);
    $(img).css('max-height', height);
    $(img).css('max-width', width);
    $(img).css('height', height);
    $(img).css('width', width);
    $(img).css('display','');
  }
  img.src = result.target.result;
}

function scaleDownTo9kb(img, start) : any
{
    let canvas = <HTMLCanvasElement> $('.jsxc-canvas')[0];

    let maxWidth = start;
    let maxHeight = start;
    let ratio = 0;
    let width = $(img).width();
    let height = $(img).height();

    // Check if the current width is larger than the max
    if(width > maxWidth){
        ratio = maxWidth / width;
        $(img).css('width', maxWidth);
        $(img).css('height', height * ratio);
        height = height * ratio;
        width = width * ratio;
    }

    // Check if current height is larger than max
    if(height > maxHeight){
        ratio = maxHeight / height;
        $(img).css('height', maxHeight);
        $(img).css('width', width * ratio);
        width = width * ratio;
        height = height * ratio;
    }

    canvas.height = height;
    canvas.width = width;
    let ctx = canvas.getContext('2d');

    //resize
    let oc = document.createElement('canvas');
    let octx = oc.getContext('2d');

    oc.width = width;
    oc.height = height;
    octx.drawImage(img, 0, 0, oc.width, oc.height);

    //resize to final size
    ctx.drawImage(oc, 0, 0, width, height, 0, 0, canvas.width, canvas.height);

    let dataurl = canvas.toDataURL('image/jpeg',0.8);
    base64data=dataurl.substring(dataurl.indexOf('base64,')+7);
    let data=atob(base64data);

    if (data.length>1024*8)
    {
        return scaleDownTo9kb(img, start-1);
    }
    else
    {
        return {'height':height,'width':width,'base64':base64data,'type':dataurl.substring(5,dataurl.indexOf(';',6)),size:data.length};
    }
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
