import Dialog from '../Dialog';
import Translation from '../../util/Translation';
import Client from '../../Client';
import AdHocCommandPlugin from '../../plugins/AdHocCommand';
import Log from '@util/Log';
import Form from '@connection/Form';

let contactBlockList = require('../../../template/adhocCommand.hbs');
let dialog: Dialog;

export default function () {
   init();
}

function init() {
   let content = contactBlockList({});

   dialog = new Dialog(content);
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
         let account = Client.getAccountManager().getAccount(uid);
         let adHocCommandPlugin = account
            .getPluginRepository()
            .getPlugin(AdHocCommandPlugin.getId()) as AdHocCommandPlugin;

         removeWarnings();

         adHocCommandPlugin
            .hasSupport()
            .then(hasSupport => {
               if (hasSupport) {
                  getCommands(adHocCommandPlugin);
               } else {
                  appendWarning(Translation.t('addhoc_cmd_not_supported'));
               }
            })
            .catch(err => {
               Log.warn('Can not check support for adHoc command', err);
               appendWarning(Translation.t('UNKNOWN_ERROR'));
            });
      });

   dialog.getDom().find('select[name="account"]').trigger('change');
}

function generateForm(stanza: Element) {
   let formElement = Form.fromXML(stanza).toHTML();

   formElement.append(`<div class="form-group">
      <div class="col-sm-offset-4 col-sm-8">
         <button class="jsxc-button jsxc-button--default jsxc-js-close" type="button">${Translation.t('Close')}</button>
         <button class="jsxc-button jsxc-button--default jsxc-js-back" type="button">${Translation.t('Retry')}</button>
         <button class="jsxc-button jsxc-button--primary" type="submit">${Translation.t('Search')}</button>
      </div>
   </div>`);

   return formElement;
}

function getCommands(adHocCommandPlugin: AdHocCommandPlugin) {
   let dom = dialog.getDom();
   dom.find('.jsxc-warning').remove();

   adHocCommandPlugin
      .requestAdHocCommands()
      .then(function (commands) {
         let select = dom.find('select.jsxc-command-selection');
         if (commands && commands.length > 0) {
            select.empty();
            for (let cmd of commands) {
               let option = $('<option>');
               option.val(cmd.node);
               option.attr('jid', cmd.jid);
               option.append(cmd.name);
               select.append(option);
            }

            initSubmitChooseCommand(dialog, adHocCommandPlugin);
         } else {
            select.parent().append(Translation.t('No_commands_available'));
            select.remove();
         }
      })
      .catch(err => {
         Log.warn('Can not get command list', err);
         appendWarning(Translation.t('UNKNOWN_ERROR'));
      });
}

function initSubmitChooseCommand(dialog: Dialog, adHocCommandPlugin: AdHocCommandPlugin) {
   dialog
      .getDom()
      .find('form')
      .off('submit')
      .on('submit', ev => {
         ev.preventDefault();
         dialog.getDom().find('input, button').prop('disabled', true);
         let option = dialog.getDom().find('select.jsxc-command-selection').find(':selected');
         adHocCommandPlugin.getCommandForm({ jid: option.attr('jid'), node: option.attr('value') }).then(stanza => {
            let formElement = generateForm(stanza);
            let command = $(stanza).find('command');
            let csessionid = command.attr('sessionid');
            let cnode = command.attr('node');
            dialog.getDom().find('.jsxc-content').empty().append(formElement);
            dialog.getDom().find('.jsxc-results').empty();

            formElement.find('.jsxc-js-close').on('click', () => dialog.close());
            formElement.find('.jsxc-js-back').on('click', () => {
               dialog.close();
               init();
            });

            if (command.attr('status') === 'completed') {
               dialog.getDom().find('.jsxc-content').empty();
               appendSearchResultsSimple(stanza, dialog);
            } else {
               formElement.on('submit', ev => {
                  ev.preventDefault();

                  formElement.find('input, button').prop('disabled', true);

                  let form = Form.fromHTML(formElement.get(0));
                  adHocCommandPlugin
                     .executeForm(option.attr('jid'), cnode, csessionid, form)
                     .then(stanza => {
                        dialog.getDom().find('.jsxc-content').empty();
                        appendSearchResults(stanza, dialog);
                     })
                     .catch(err => {
                        dialog.getDom().find('.jsxc-results').empty();
                     })
                     .then(() => {
                        formElement.find('input, button').prop('disabled', false);
                     });
               });
            }
         });
      });
}

function appendSearchResultsSimple(resultStanza: Element, dialog: Dialog) {
   let table: JQuery;
   table = Form.fromXMLCommand(resultStanza).toHTML();

   table.find('tr').each((index, row) => {
      let cell = $('<td>');

      if (index > 0) {
         cell.append((index - 1).toString());
      }

      $(row).prepend(cell);
   });

   let dom = dialog.getDom();

   table.addClass('jsxc-searchresults-table');

   dialog.getDom().find('.jsxc-results').empty().append($('<form>').append(table));

   dom.find('.jsxc-results form').append(`<div class="form-group">
   <div class="col-sm-offset-4 col-sm-8">
         <button class="jsxc-button jsxc-button--primary" type="submit">${Translation.t('Close')}</button>
      </div>
   </div>`);

   dom.find('.jsxc-results form').on('submit', function (ev) {
      ev.preventDefault();
      dialog.close();
   });

   dom.find('.jsxc-js-close').on('click', () => {
      dialog.close();
   });
}

function appendSearchResults(resultStanza: Element, dialog: Dialog) {
   let table: JQuery;
   table = Form.fromXMLCommand(resultStanza).toHTMLCommand();

   table.find('tr').each((index, row) => {
      let cell = $('<td>');

      if (index > 0) {
         cell.append((index - 1).toString());
      }

      $(row).prepend(cell);
   });

   let dom = dialog.getDom();

   table.addClass('jsxc-searchresults-table');

   dialog.getDom().find('.jsxc-results').empty().append($('<form>').append(table));

   dom.find('.jsxc-results form').append(`<div class="form-group">
   <div class="col-sm-offset-4 col-sm-8">
         <button class="jsxc-button jsxc-button--primary" type="submit">${Translation.t('Close')}</button>
      </div>
   </div>`);

   dom.find('.jsxc-results form').on('submit', function (ev) {
      ev.preventDefault();
      dialog.close();
   });

   dom.find('.jsxc-js-close').on('click', () => {
      dialog.close();
   });
}

function appendWarning(text: string) {
   let dom = dialog.getDom();

   $('<div>').addClass('jsxc-warning').text(text).appendTo(dom);
}

function removeWarnings() {
   let dom = dialog.getDom();

   dom.find('.jsxc-warning').remove();
}
