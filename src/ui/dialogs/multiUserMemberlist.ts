import Dialog from '../Dialog'
import MultiUserContact from '../../MultiUserContact'
import Translation from '../../util/Translation'


let multiUserMemberlist = require('../../../template/multiUserMemberlist.hbs');

export default function(multiUserContact: MultiUserContact) {
   let content = multiUserMemberlist({});

   let dialog = new Dialog(content);

   let connection = multiUserContact.getAccount().getConnection();
   let items;

   connection.getMUCService().getMemberlistMultiUserRoom(multiUserContact.getJid())
      .then(function(stanza){

          if ($(stanza).attr('type')==='result')
          {
              dialog.open();
              initSubmit(multiUserContact, dialog,items,connection);
              items = $(stanza).find('item');
              let textfield = $('#jsxc-memberlist-textarea');
              let memberJids = items.map((_, item) => $(item).attr('jid')).get();
              textfield.val(memberJids.join('\n'));
          }
          else
          {
              alert(Translation.t('UNKNOWN_ERROR'));
          }
    });
}

function initSubmit(multiUserContact: MultiUserContact, dialog: Dialog, items, connection)
{
    dialog.getDom().find('form').on('submit', (ev) => {
      ev.preventDefault();
      let saveitems = $('.jsxc-memberlist-textarea').val().toString().split('\n').map(item => item.trim());

      //check old items if there were deleted
      for (let i=0;i<items.length;i++)
      {

          let found=false;
          for (let n=0;n<saveitems.length;n++)
          {
              if (saveitems[n].length>0&&$(items[i]).attr('jid')===saveitems[n])
              {
                  found=true;
                  break;
              }
          }
          if (!found)
          {
              $(items[i]).attr('affiliation','none');
          }
      }

      //check for new items which were added

      for (let i=0;i<saveitems.length;i++)
      {
          if (saveitems[i].trim().length===0)
              continue;

          let found=false;
          for (let n=0;n<items.length;n++)
          {
              if ($(items[n]).attr('jid')===saveitems[i].trim())
              {
                  found=true;
                  break;
              }
          }
          if (!found)
          {
              items.push($('<item affiliation="member" jid="'+saveitems[i].trim()+'" />')[0]);
          }
      }

      connection.getMUCService().setMemberlistMultiUserRoom(multiUserContact.getJid(),items).then(function(stanza){

          if ($(stanza).attr('type')==='result')
          {
//add some result info?
          }
          else
          {
              alert(Translation.t('UNKNOWN_ERROR'));
          }
      });

      dialog.close();
   });
}
