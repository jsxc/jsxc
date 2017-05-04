import Dialog from '../Dialog';
import JID from '../../JID';
import StorageSingleton from '../../StorageSingleton';
import Connection from '../../connection/Connection';

var vcardTemplate = require('../../../template/vcard.hbs');

export default function(jid:JID) {
   let storage = StorageSingleton.getUserStorage();
   let userData = storage.getItem('buddy', jid.bare);

   let basicData = aggregateBasicUserData(userData);

   let content = vcardTemplate({
      name: userData.name,
      basic: basicData
   });
   let dialog = new Dialog(content);
   dialog.open();

   Connection.loadVcard(jid)
      .then(vcardSuccessCallback)
      .catch(vcardErrorCallback)
      .then(function(vcardData){
         let content = Templates.get('vcard-body', {
            properties: vcardData
         });

         dialog.append(content);

         dialog.getDom().find('.jsxc-waiting').remove();
      });
}

// @TODO use interface for user data
function aggregateBasicUserData(userData) {
   let bid = userData.jid.bare;
   var identity = null;
   var basicUserData = [];

   for (let i = 0; i < userData.res.length; i++) {
      let ressource = userData.res[i];

      let identities = [];
      let capabilities = Connection.getCapabilitiesByJid(new JID(bid + '/' + ressource));

      if (capabilities !== null && capabilities.identities !== null) {
         identities = capabilities.identities;
      }

      let client = '';
      for (let j = 0; j < identities.length; j++) {
         let identity = identities[j];

         if (identity.category === 'client') {
            if (client !== '') {
               client += ',\n';
            }

            client += identity.name + ' (' + identity.type + ')';
         }
      }

      let status = jsxc.storage.getUserItem('res', bid)[res];

      basicUserData.push({
         resource: ressource,
         client: client,
         status: jsxc.CONST.STATUS[status],
      });
   }

   return basicUserData;
}

function aggregateProperties(el) {
   let properties = [];

   el.each(function() {
      var item = $(this);
      var children = $(this).children();

      let name = item[0].tagName;
      let value = null, props = null;

      if (name !== ' ') {
         // @TODO ?
      }

      if (name === 'PHOTO') {
         // @TODO ?
      } else if (children.length > 0) {
         props = aggregateProperties(children);
      } else if (item.text() !== '') {
         value = item.text();
      }

      properties.push({
         name: name,
         value: value,
         properties: props
      });
   });

   return properties;
}

function vcardSuccessCallback(stanza:string) {

   if ($('#jsxc_dialog ul.jsxc_vCard').length === 0) {
      return;
   }

   $('#jsxc_dialog p').remove();

   var photo = $(stanza).find("vCard > PHOTO");

   if (photo.length > 0) {
      var img = photo.find('BINVAL').text();
      var type = photo.find('TYPE').text();
      var src = 'data:' + type + ';base64,' + img;

      if (photo.find('EXTVAL').length > 0) {
         src = photo.find('EXTVAL').text();
      }

      // concat chunks
      src = src.replace(/[\t\r\n\f]/gi, '');

      var img_el = $('<img class="jsxc_vCard" alt="avatar" />');
      img_el.attr('src', src);

      $('#jsxc_dialog h3').before(img_el);
   }

   if ($(stanza).find('vCard').length === 0 || ($(stanza).find('vcard > *').length === 1 && photo.length === 1)) {
      return vcardErrorCallback();
   }

   return aggregateProperties($(stanza).find('vcard > *'));
}

function vcardErrorCallback() {
   if ($('#jsxc_dialog ul.jsxc_vCard').length === 0) {
      return;
   }

   $('#jsxc_dialog p').remove();

   var content = '<p>';
   content += $.t('Sorry_your_buddy_doesnt_provide_any_information');
   content += '</p>';

   $('#jsxc_dialog').append(content);
}
