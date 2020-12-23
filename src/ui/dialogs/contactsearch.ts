import Dialog from '../Dialog'
import Contact from '../../Contact'
import Form from '../../connection/Form'
import Log from '../../util/Log'
import { IConnection } from '@connection/Connection.interface';
import Translation from '@util/Translation';
import Client from '../../Client'
import Account from '../../Account'
import JID from '../../JID'

let dialog: Dialog;

export const CANCELED = 'canceled';

let contactSearchTemplate = require('../../../template/contactsearch.hbs');

export default function(username?: string) {

    let content = contactSearchTemplate({
      accounts: Client.getAccountManager().getAccounts().map(account => ({
         uid: account.getUid(),
         jid: account.getJID().bare,
      }))
    });

    dialog = new Dialog(content);
    dialog.open();

    let accountId = <string> $('#jsxc-account').val();

    let account = Client.getAccountManager().getAccount(accountId);

    let connection = account.getConnection();

    getSearchServiceDomain(connection,account).then((services) => {
        if (services&&services.length>0)
        {
            connection.getSearchService().getSearchForm(services[0].domain)
              .then(stanza => Form.fromXML(stanza))
              .then((form: Form) => {
                 return showForm(form, connection,services[0]);
            }).then(function(searchresult :Element ){ showResult(searchresult,account);});
        }
        else
        {
            dialog.close();
            alert(Translation.t('not_available'));
        }
    });

}

function getSearchServiceDomain(connection : IConnection, account : Account)
{

    let ownJid = connection.getJID();
    let serverJid = new JID('', ownJid.domain, '');
    let discoInfoRepository = account.getDiscoInfoRepository();

    return connection.getDiscoService().getDiscoItems(serverJid).then((stanza) =>
    {
        let promises = [];

        $(stanza).find('item').each((index, element) =>
        {
            let jid = new JID('', $(element).attr('jid'), '');

            let promise = discoInfoRepository.requestDiscoInfo(jid).then((discoInfo) => {
               let hassearch = discoInfo.getFeatures().indexOf('jabber:iq:search')>-1;
               let donthavemuc = discoInfo.getFeatures().indexOf('http://jabber.org/protocol/muc')<0;
               let resval = hassearch&&donthavemuc;
               return resval;
            }).then((hasFeature) => {
               return hasFeature ? jid : undefined;
            }).catch((stanza) => {
               const from = $(stanza).attr('from') || '';
               Log.info(`Ignore ${from} as Search provider, because could not load disco info.`);
            });

            promises.push(promise);
        });

        return Promise.all(promises).then((results) => {
            return results.filter(jid => typeof jid !== 'undefined');
        });
      })
   }

function showResult(result: Element, account : Account)
{

    let submitButton = $(`<div class="form-group">
      <div class="col-sm-offset-4 col-sm-8">
         <button id="jsxc-searchresults-button-cancel" class="jsxc-button jsxc-button--default jsxc-js-close" type="button">${Translation.t('Cancel')}</button>
         <button id="jsxc-searchresults-button-add" class="jsxc-button jsxc-button--primary" type="submit">${Translation.t('Add')}</button>
      </div>
    </div>`);

    let header = [];
    header.push(Translation.t('Add')); //first

    let items=null;
    let simple=false;
    let fields = null;
    if ((items=$(result).find('query').children('item')).length>0)//Simple results
    {

        header.push(Translation.t('First')); //first
        header.push(Translation.t('Last')); //last
        header.push(Translation.t('Nick')); //nick
        header.push(Translation.t('Email')); //email

        simple=true;
    }
    else
        if ($(result).find('query').children('x').length>0)//Extended results
        {
            items=$(result).find('query').children('x').children('item');
            if (items.length===0)
            {
                //NO RESULTS FOUND!
                dialog.close();
                alert(Translation.t('no_results'));
                return;
            }
            fields = $(result).find('query').find('reported').children('field');
            let i=0;
            for (;i<fields.length;i++)
            {
                header.push($(fields[i]).attr('label'));
            }
        }
        else
        {
            //NO RESULTS FOUND!
            dialog.close();
            alert(Translation.t('no_results'));
            return;
        }

    let html = '<table id="jsxc-searchresults" class="jsxc-searchresults-table"><thead class="jsxc-searchresults-table-head"><tr class="jsxc-searchresults-table-head-row">';
    let i=0;
    for (;i<header.length;i++)
    {
        html+='<th>'+header[i]+'</th>';
    }
    html+='</tr></thead><tbody class="jsxc-searchresults-table-body">';

    i=0;
    for (;i<items.length;i++)
    {
        html+='<tr class="jsxc-searchresults-table-body-row '+(i%2===0?'jsxc-searchresults-odd':'jsxc-searchresults-even')+'"><td><input class="jsxc-searchresults-add" type="checkbox" name="jsxc-add-contact" value="'+i+'"/></td>';
        if (simple)
        {
            html+='<td>';
            if ($(items[i]).children('first').length>0)
            {
                html+=$(items[i]).children('first').text();
            }
            html+='</td><td>';
            if ($(items[i]).children('last').length>0)
            {
                html+=$(items[i]).children('last').text();
            }
            html+='</td><td>';
            if ($(items[i]).children('nick').length>0)
            {
                html+=$(items[i]).children('nick').text();
            }
            html+='</td><td>';
            if ($(items[i]).children('email').length>0)
            {
                html+=$(items[i]).children('email').text();
            }
            html+='</td>';
        }
        else
        {
            let n=0;
            for (;n<fields.length;n++)
            {
                html+='<td>';
                html+=$(items[i]).find('field[var="'+$(fields[n]).attr('var')+'"]').text();
                html+='</td>';
            }
        }

        html+='</tr>';
    }

    html+='</tbody></table>';

    dialog.getDom().find('#content').empty().append(html);
    dialog.getDom().find('#content').append(submitButton);

    $('#jsxc-searchresults-button-add').on('click',function(e)
    {
        let chboxarr = $('input[name="jsxc-add-contact"]:checked');
        if (chboxarr.length>0)
        {
            let m=0;
            for (;m<chboxarr.length;m++)
            {
                let val = Number($(chboxarr[m]).val());
                let jid = simple?new JID($(items[val]).children('nick').text()+'@'+account.getJID().domain):new JID($(items[val]).find('field[var="jid"]').text());
                let contact = new Contact(account, jid, '');

                account.getContactManager().add(contact);
            }
        }
        dialog.close();
    });

    $('#jsxc-searchresults-button-cancel').on('click',function(e)
    {
        dialog.close();
    });
}

function showForm(form: Form, connection: IConnection, jid : JID) {
   let formElement = form.toHTML();

   let submitButton = $(`<div class="form-group">
      <div class="col-sm-offset-4 col-sm-8">
         <button class="jsxc-button jsxc-button--default jsxc-js-close" type="button">${Translation.t('Cancel')}</button>
         <button class="jsxc-button jsxc-button--primary" type="submit">${Translation.t('Search')}</button>
      </div>
   </div>`);
   formElement.append(submitButton);

   dialog.getDom().find('#content').empty().append(formElement);

   return new Promise((resolve, reject) => {
        formElement.submit((ev) => {
        ev.preventDefault();

        let formval = Form.fromHTML(formElement.get(0));

        let submitPromise = connection.getSearchService().executeSearchForm(jid,formval).then((stanza) => {
            return stanza;
        });
        resolve(submitPromise);
      });

      formElement.find('.jsxc-js-close').click((ev) => {
         ev.preventDefault();

         dialog.close();

         resolve(null);
      });
   });
}
