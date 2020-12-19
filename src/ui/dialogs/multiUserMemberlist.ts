import Dialog from '../Dialog'
import MultiUserContact from '../../MultiUserContact'
import Translation from '../../util/Translation'


let multiUserMemberlist = require('../../../template/multiUserMemberlist.hbs');

export default function(multiUserContact: MultiUserContact) {
   let content = multiUserMemberlist({});

   let dialog = new Dialog(content);
   let dom = dialog.open();
   let connection = multiUserContact.getAccount().getConnection();
   let items;

   dom.find('form').on('submit', (ev) => {
      ev.preventDefault();
      let saveitems = $('.jsxc-memberlist-textarea').val().toString().split('\n');
      let i=0;
      //check old items if there were deleted
      for (;i<items.length;i++)
      {
          let n=0;
          let found=false;
          for (;n<saveitems.length;n++)
          {
              if (saveitems[n].trim().length>0&&$(items[i]).attr('jid')===saveitems[n].trim())
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
      i=0;
      for (;i<saveitems.length;i++)
      {
          if (saveitems[i].trim().length===0)
              continue;

          let n=0;
          let found=false;
          for (;n<items.length;n++)
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
           console.log(stanza);
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

    connection.getMUCService().getMemberlistMultiUserRoom(multiUserContact.getJid())
      .then(function(stanza){
          //$('.jsxc-memberlist-textarea').val(stanza);
          if ($(stanza).attr('type')==='result')
          {
              items = $(stanza).find('item');

              let textfield = $('#jsxc-memberlist-textarea');
              textfield.empty();

              let i=0;
              for (;i<items.length;i++)
              {
                  textfield.append($(items[i]).attr('jid')+'\n');
              }
          }
          else
          {
              alert(Translation.t('UNKNOWN_ERROR'));
          }
    });
}
