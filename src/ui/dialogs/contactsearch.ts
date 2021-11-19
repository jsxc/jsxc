import Dialog from '../Dialog';
import Form from '../../connection/Form';
import Log from '../../util/Log';
import openContactDialog from './contact';
import Translation from '@util/Translation';
import Client from '../../Client';
import Account from '../../Account';
import JID from '../../JID';
import { IJID } from '@src/JID.interface';
import FormField from '@connection/FormField';
import showMultiUserJoinDialog from './multiUserJoin';

export const CANCELED = 'canceled';

const possibleSearchFields = ['first', 'last', 'nick', 'email'];

let contactSearchTemplate = require('../../../template/contactsearch.hbs');

export default function (jid? : IJID) {
   let content = contactSearchTemplate();

   let dialog = new Dialog(content);
   dialog.open();

   let accounts = Client.getAccountManager().getAccounts();
   accounts.forEach(account => {
      let accountoption = $('<option>').text(account.getJID().bare).val(account.getUid());

      dialog.getDom().find('select[name="account"]').append(accountoption);
   });

   dialog
      .getDom()
      .find('select[name="account"]')
      .on('change', ev => {
         let uid = $(ev.target).val().toString();

         if (jid===undefined)
         {
            loadForm(Client.getAccountManager().getAccount(uid), dialog);
         }
         else
         {
            loadFormFromMucService(Client.getAccountManager().getAccount(uid), jid, dialog);
         }

      });

   if (jid===undefined)
   {
      loadForm(accounts[0], dialog);
   }
   else
   {
      dialog.getDom().find('h3').hide();
      dialog.getDom().find('h3').before(`<h4>${jid.toString()}</h4>`);
      dialog.getDom().find('.jsxc-account-choice').hide();
      loadFormFromMucService(accounts[0], jid, dialog);
   }
}

function loadFormFromMucService(account: Account, jid: IJID, dialog: Dialog) {
   let searchService = account.getConnection().getSearchService();

   searchService.getSearchForm(jid).then((searchFormElement)=>{

      let formElement = generateForm(searchFormElement);

      dialog.getDom().find('.jsxc-content').empty().append(formElement);
      dialog.getDom().find('.jsxc-results').empty();

      formElement.find('.jsxc-js-close').on('click', () => dialog.close());

      formElement.on('submit', ev => {
         ev.preventDefault();

         formElement.find('input, button').prop('disabled', true);

         let form;

         if (formElement.hasClass('jsxc-simple-form')) {
            form = {};

            possibleSearchFields.forEach(name => {
               form[name] = formElement.find(`input[name="${name}"]`).val();
            });
         } else {
            form = Form.fromHTML(formElement.get(0));
         }

         searchService
            .executeSearchForm(jid, form)
            .then(resultStanza => {
               appendSearchResults(resultStanza, dialog, true);
            })
            .catch(err => {
               dialog.getDom().find('.jsxc-results').empty();
            })
            .then(() => {
               formElement.find('input, button').prop('disabled', false);
            });
      });
   });
}

function loadForm(account: Account, dialog: Dialog) {
   let searchService = account.getConnection().getSearchService();

   getSearchService(account).then(async services => {
      if (!services || services.length === 0) {
         dialog.getDom().find('.jsxc-content').text(Translation.t('not_available'));

         return;
      }

      let searchFormElement = await searchService.getSearchForm(services[0]);

      let formElement = generateForm(searchFormElement);

      dialog.getDom().find('.jsxc-content').empty().append(formElement);
      dialog.getDom().find('.jsxc-results').empty();

      formElement.find('.jsxc-js-close').on('click', () => dialog.close());

      formElement.on('submit', ev => {
         ev.preventDefault();

         formElement.find('input, button').prop('disabled', true);

         let form;

         if (formElement.hasClass('jsxc-simple-form')) {
            form = {};

            possibleSearchFields.forEach(name => {
               form[name] = formElement.find(`input[name="${name}"]`).val();
            });
         } else {
            form = Form.fromHTML(formElement.get(0));
         }

         searchService
            .executeSearchForm(services[0], form)
            .then(resultStanza => {
               appendSearchResults(resultStanza, dialog);
            })
            .catch(err => {
               dialog.getDom().find('.jsxc-results').empty();
            })
            .then(() => {
               formElement.find('input, button').prop('disabled', false);
            });
      });
   });
}

async function getSearchService(account: Account): Promise<IJID[]> {
   let connection = account.getConnection();
   let ownJid = connection.getJID();
   let serverJid = new JID('', ownJid.domain, '');
   let discoInfoRepository = account.getDiscoInfoRepository();

   return connection
      .getDiscoService()
      .getDiscoItems(serverJid)
      .then(stanza => {
         let promises = $(stanza)
            .find('item')
            .map((index, element) => {
               let jid = new JID('', $(element).attr('jid'), '');

               return discoInfoRepository
                  .requestDiscoInfo(jid)
                  .then(discoInfo => {
                     let hasSearch = discoInfo.hasFeature('jabber:iq:search');
                     let isMUC = discoInfo.hasFeature('http://jabber.org/protocol/muc');

                     return hasSearch && !isMUC ? jid : undefined;
                  })
                  .catch(stanza => {
                     const from = $(stanza).attr('from') || '';

                     Log.info(`Ignore ${from} as Search provider, because could not load disco info.`);

                     return undefined;
                  });
            })
            .get();

         return Promise.all(promises).then(results => {
            return results.filter(jid => typeof jid !== 'undefined');
         });
      });
}

function generateForm(stanza: Element) {
   let formElement =
      $(stanza).find('x[xmlns="jabber:x:data"]').length > 0
         ? Form.fromXML(stanza).toHTML()
         : generateSimpleForm(stanza);

   formElement.append(`<div class="form-group">
   <div class="col-sm-offset-4 col-sm-8">
       <button class="jsxc-button jsxc-button--default jsxc-js-close" type="button">${Translation.t('Close')}</button>
       <button class="jsxc-button jsxc-button--primary" type="submit">${Translation.t('Search')}</button>
   </div>
</div>`);

   return formElement;
}

function generateSimpleForm(element: Element) {
   let formElement = $('form');
   formElement.attr('autocomplete', 'off');
   formElement.addClass('form-horizontal jsxc-simple-form');

   let queryElement = $(element).find('query[xmlns="jabber:iq:search"]');
   let instructionsElement = queryElement.find('>instructions');

   if (instructionsElement.length > 0) {
      $('<p>').text(instructionsElement.text()).appendTo(formElement);
   }

   possibleSearchFields.forEach(field => {
      let fieldElement = queryElement.find('>' + field);

      if (fieldElement.length > 0) {
         let formField = new FormField({ name: field });

         formElement.append(formField.toHTML());
      }
   });

   return formElement;
}

function appendSearchResults(resultStanza: Element, dialog: Dialog, mucsearch: boolean = false) {
   let table: JQuery;
   let items = $(resultStanza).find('query>item');

   if ($(resultStanza).find('x[xmlns="jabber:x:data"]').length > 0) {
      table = Form.fromXML(resultStanza).toHTML();
   } else {
      table = generateTableForSimpleResult(items);
   }

   table.find('tr').each((index, row) => {
      let cell = $('<td>');

      if (index > 0) {
         cell.append(`<input type="radio" name="jsxc-add-contact" value="${index - 1}" required="required"/>`);
      }

      $(row).prepend(cell);
   });

   let dom = dialog.getDom();

   table.addClass('jsxc-searchresults-table');

   dialog.getDom().find('.jsxc-results').empty().append($('<form>').append(table));

   dom.find('.jsxc-results form').append(`<div class="form-group">
   <div class="col-sm-offset-4 col-sm-8">
      <button class="jsxc-button jsxc-button--primary" type="submit">${mucsearch===false?Translation.t('Add'):Translation.t('Continue')}</button>
   </div>
 </div>`);

   dom.find('.jsxc-results form').on('submit', function (ev) {
      ev.preventDefault();

      let bareJid = '';
      let alias = '';
      let selectedIndex = parseInt(dom.find('input[name="jsxc-add-contact"]:checked').val().toString(), 10);

      if (!isNaN(selectedIndex)) {
         let extendedItem = $(resultStanza).find('x[xmlns="jabber:x:data"] > item').eq(selectedIndex);
         let simpleItem = $(resultStanza).find('item').eq(selectedIndex);

         if (extendedItem.length === 1) {
            bareJid = extendedItem.find('field[var="jid"]').text();
            alias =
               extendedItem.find('field[var="first"]').text() + ' ' + extendedItem.find('field[var="last"]').text();
         } else if (simpleItem.length === 1) {
            bareJid = simpleItem.attr('jid');
            alias = simpleItem.find('first').text() + ' ' + simpleItem.find('last').text();
         }
      }
         
      dialog.close();

      if (bareJid!=='')
      {
         if (!mucsearch)
         {
            openContactDialog(bareJid, alias);
         }
         else 
         {
            let bjid = new JID(bareJid);            
            showMultiUserJoinDialog(bjid.domain, bjid.node);
         }
      }
   });

   dom.find('.jsxc-js-close').on('click', () => {
      dialog.close();
   });
}

function generateTableForSimpleResult(items: JQuery) {
   let tableElement = $('<table>');
   let tableHeader = $('<thead>');
   let headerRow = $('<tr>');

   tableElement.append(tableHeader);
   tableHeader.append(headerRow);

   const columnNames = ['First', 'Last', 'Nick', 'Email'];

   columnNames.forEach(name => $('<th>').text(Translation.t(name)).appendTo(headerRow));

   let tableBody = $('<tbody>');
   tableElement.append(tableBody);

   for (let item of items) {
      let row = $('<tr>');

      columnNames.forEach(name => {
         $('<td>').text($(item).children(name.toLowerCase()).text()).appendTo(row);
      });

      tableBody.append(row);
   }

   return tableElement;
}
