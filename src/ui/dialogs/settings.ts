import Dialog from '../Dialog'
import Client from '../../Client'
import Page from '../DialogPage'
import Section from '../DialogSection'
import Navigation from '../DialogNavigation'
import List from '../DialogList'
import ListItem from '../DialogListItem'
import AvatarSet from '../AvatarSet'
import Log from '../../util/Log'
import Translation from '@util/Translation';
import Account from '@src/Account';

const ENOUGH_BITS_OF_ENTROPY = 50;

export default function() {
   let dialog = new Dialog('', false, 'settings');
   let dom = dialog.open();

   let navigation = new Navigation(dom);
   navigation.goTo(new StartPage(navigation));
}

class StartPage extends Page {
   constructor(navigation: Navigation) {
      super(navigation, Translation.t('Settings'));
   }

   //@REVIEW could also return Page or getDOM interface?
   protected generateContentElement(): JQuery | JQuery[] {
      return [
         new ClientSection(this.navigation).getDOM(),
         new AccountOverviewSection(this.navigation).getDOM()
      ];
   }
}

class ClientSection extends Section {
   protected generateContentElement(): JQuery {
      let contentElement = new List();

      contentElement.append(new ListItem(
         Translation.t('Language'),
         Translation.t('After_changing_this_option_you_have_to_reload_the_page'),
         undefined,
         undefined,
         this.getLanguageSelectionElement()
      ));

      contentElement.append(new ListItem(
         Translation.t('trusted_domains'),
         Translation.t('one_domain_per_line'),
         undefined,
         undefined,
         this.getTrustedDomainsElement()
      ));

      return contentElement.getDOM();
   }

   private getLanguageSelectionElement() {
      let currentLang = Client.getOption('lang');
      let element = $('<select>');
      element.append('<option value=""></option>');
      __LANGS__.forEach((lang) => {
         let optionElement = $('<option>');
         optionElement.text(lang);
         optionElement.appendTo(element);

         if (lang === currentLang) {
            optionElement.attr('selected', 'selected');
         }
      });

      element.on('change', (ev) => {
         let value = $(ev.target).val();

         Client.setOption('lang', value ? value : undefined);
      });

      if (element.find('[selected]').length === 0) {
         element.find('option:eq(0)').attr('selected', 'selected');
      }

      return element;
   }

   private getTrustedDomainsElement(): JQuery {

      let element = $('<textarea style="margin-left:10px;">');

      element.on('change', () => {
         let value = element.val().toString().split('\n').map(line => line.trim());
         Client.setOption('trustedDomains',value ? value : undefined);
      });

      let trustedDomains = Client.getOption('trustedDomains', []);
      element.val(trustedDomains.join('\n'));

      return element;
   }
}

class AccountOverviewSection extends Section {
   constructor(navigation: Navigation) {
      super(navigation, Translation.t('Accounts'));
   }

   protected generateContentElement(): JQuery {
      let accounts = Client.getAccountManager().getAccounts();
      let contentElement = new List();

      for (let account of accounts) {
         let jid = account.getJID();
         let name = jid.bare;
         let avatarElement = $('<div>');
         avatarElement.addClass('jsxc-avatar');
         AvatarSet.setPlaceholder(avatarElement, name, jid);

         let actionHandler = () => this.navigation.goTo(new AccountPage(this.navigation, account));
         let accountElement = new ListItem(name, undefined, actionHandler, avatarElement);

         contentElement.append(accountElement);
      }

      return contentElement.getDOM();
   }
}

class AccountPage extends Page {
   constructor(navigation: Navigation, private account: Account) {
      super(navigation, account.getJID().bare);
   }

   protected generateContentElement(): JQuery {
      let contentElement = $('<div>');

      contentElement.append(new ConnectionSection(this.navigation, this.account).getDOM());
      contentElement.append(new MainAppSection(this.navigation).getDOM());
      contentElement.append(new PluginSection(this.navigation, this.account).getDOM());

      return contentElement;
   }
}

//@REVIEW priorities? Are they still needed/used?
class ConnectionSection extends Section {
   constructor(navigation: Navigation, private account: Account) {
      super(navigation, Translation.t('Connection'));
   }

   protected generateContentElement(): JQuery {
      let jid = this.account.getJID();
      let contentElement = new List();

      let changePasswordActionHandler = () => this.navigation.goTo(new PasswordPage(this.navigation, this.account));

      contentElement.append(new ListItem('Jabber ID', jid.bare));
      contentElement.append(new ListItem(Translation.t('Resource'), jid.resource));
      contentElement.append(new ListItem(Translation.t('Connectiontype'), (/^ws?:/.test(this.account.getConnectionUrl())||/^wss?:/.test(this.account.getConnectionUrl()))?'WEBSOCKET':'BOSH'));
      contentElement.append(new ListItem('Url', this.account.getConnectionUrl()));
      contentElement.append(new ListItem(Translation.t('Change_password'), undefined, changePasswordActionHandler));

      return contentElement.getDOM();
   }
}

class PasswordPage extends Page {
   constructor(navigation: Navigation, private account: Account) {
      super(navigation, Translation.t('Password'));
   }

   protected generateContentElement(): JQuery {
      //@REVIEW maybe template
      let contentElement = $('<form>');
      contentElement.addClass('form-horizontal');
      contentElement.css('marginTop', '30px'); //@REVIEW

      let explanationElement = $(`<p class="jsxc-explanation">${Translation.t('password_explanation')}</p>`);

      let passwordAElement = $(`<div class="form-group">
         <label class="col-sm-4 control-label" for="jsxc-password-A">${Translation.t('Password')}</label>
         <div class="col-sm-8">
            <input type="password" name="password-A" id="jsxc-password-A" class="form-control" required="required">
            <p class="jsxc-inputinfo"></p>
         </div>
      </div>`);

      let passwordBElement = $(`<div class="form-group">
         <label class="col-sm-4 control-label" for="jsxc-password-B">${Translation.t('Control')}</label>
         <div class="col-sm-8">
            <input type="password" name="password-B" id="jsxc-password-B" class="form-control" required="required">
            <p class="jsxc-inputinfo jsxc-hidden"></p>
         </div>
      </div>`);

      let submitElement = $(`<div class="form-group">
         <div class="col-sm-offset-4 col-sm-8">
            <button disabled="disabled" class="jsxc-button jsxc-button--primary">${Translation.t('Change_password')}</button>
         </div>
      </div>`);

      let errorElement = $(`<div class="jsxc-alert jsxc-alert--warning jsxc-hidden"></div>`);

      contentElement.append(explanationElement);
      contentElement.append(passwordAElement);
      contentElement.append(passwordBElement);
      contentElement.append(submitElement);
      contentElement.append(errorElement);

      passwordAElement.find('input').on('input', function() {
         let value = <string> $(this).val();
         let numberOfPossibleCharacters = 0;

         if (/[a-z]/.test(value)) {
            numberOfPossibleCharacters += 26
         }

         if (/[A-Z]/.test(value)) {
            numberOfPossibleCharacters += 26
         }

         if (/[0-9]/.test(value)) {
            numberOfPossibleCharacters += 10
         }

         if (/[^a-zA-Z0-9]/.test(value)) {
            numberOfPossibleCharacters += 15 // most common
         }

         let entropy = Math.pow(numberOfPossibleCharacters, value.length);
         let bitsOfEntropy = Math.log2(entropy);
         let strength = Math.min(100, Math.round(bitsOfEntropy / ENOUGH_BITS_OF_ENTROPY * 100));

         passwordAElement.find('.jsxc-inputinfo').text(`${Translation.t('Strength')}: ${strength}%`);
      });

      contentElement.find('input').on('input', function() {
         let passwordA = passwordAElement.find('input').val();
         let passwordB = passwordBElement.find('input').val();

         submitElement.find('button').prop('disabled', passwordA !== passwordB)
      });

      contentElement.submit((ev) => {
         ev.preventDefault();

         let passwordA = passwordAElement.find('input').val() as string;
         let passwordB = passwordBElement.find('input').val() as string;

         if (passwordA !== passwordB) {
            return;
         }

         this.account.getConnection().changePassword(passwordA).then(() => {
            Log.debug('Password was changed');
         }).catch((errStanza) => {
            //@TODO check for error 401 and form (https://xmpp.org/extensions/xep-0077.html#usecases-changepw)

            errorElement.removeClass('jsxc-hidden');
            errorElement.text('Server error. Password was not changed.');
         });
      });

      return contentElement;
   }
}

class MainAppSection extends Section {
   constructor(navigation: Navigation) {
      super(navigation, Translation.t('General'), true);
   }

   protected generateContentElement(): JQuery {

      let contentElement = new List();

      contentElement.append(this.getListItemForData('RFC6120', 'XMPP Core', '', ''));
      contentElement.append(this.getListItemForData('RFC6121', 'XMPP IM', '', ''));
      contentElement.append(this.getListItemForData('', 'Off-the-Record Messaging', '', ''));
      contentElement.append(this.getListItemForData('', 'Data Forms', '0030', ''));
      contentElement.append(this.getListItemForData('', 'Service Discovery', '0163', '1.2.1'));
      contentElement.append(this.getListItemForData('', 'vcard-temp', '0054', ''));
      contentElement.append(this.getListItemForData('', 'Software Version', '0115', ''));
      contentElement.append(this.getListItemForData('', 'Entity Capabilities', '0163', '1.2.1'));
      contentElement.append(this.getListItemForData('', 'URI Scheme Query', '0147', ''));
      contentElement.append(this.getListItemForData('', 'Jingle', '0166', ''));
      contentElement.append(this.getListItemForData('', 'Jingle RTP Sessions', '0167', ''));
      contentElement.append(this.getListItemForData('', 'Jingle File Transfer', '0234', ''));
      contentElement.append(this.getListItemForData('', 'Delayed Delivery', '0203', ''));
      contentElement.append(this.getListItemForData('', 'XMPP Over BOSH', '0206', ''));
      contentElement.append(this.getListItemForData('', 'Bidirectional-streams Over Synchronous HTTP', '0124', ''));
      contentElement.append(this.getListItemForData('', 'Stanza Forwarding', '0297', ''));
      contentElement.append(this.getListItemForData('', 'Multi-User Chat', '0045', ''));
      contentElement.append(this.getListItemForData('', 'Jabber Search', '0055', '1.3'));
      contentElement.append(this.getListItemForData('', 'Publish-Subscribe', '0060', '1.2.1'));
      contentElement.append(this.getListItemForData('', 'Personal Eventing Protocol', '0163', '1.2.1'));

      return contentElement.getDOM();
   }

   private getListItemForData(description, xepname, xepid, xepversion) {
      let checkboxElement = $('<input>');
      checkboxElement.attr('type', 'checkbox');

      checkboxElement.prop('checked', true);
      checkboxElement.prop('disabled', true);

      let listItem = new ListItem(xepname, description, undefined, undefined, checkboxElement);
      let listItemElement = listItem.getDOM();

      if (xepid && xepid.length) {
         let xepElement = $('<a target="_blank" rel="noreferrer noopener">');
         xepElement.addClass('jsxc-badge');
         xepElement.text('XEP-' + xepid + (xepversion && xepversion.length > 0 ? ('@' + xepversion) : ''));
         xepElement.attr('title', xepname);
         xepElement.attr('href', 'https://xmpp.org/extensions/xep-' + xepid + '.html');
         xepElement.appendTo(listItemElement.find('.jsxc-list__text__primary'));
      }

      return listItem;
   }
}

class PluginSection extends Section {
   constructor(navigation: Navigation, private account: Account) {
      super(navigation, Translation.t('Plugins'), true);
   }

   protected generateContentElement(): JQuery {
      let contentElement = new List();

      let disabledPlugins = this.account.getOption('disabledPlugins') || [];
      let pluginRepository = this.account.getPluginRepository();

      for (let plugin of pluginRepository.getAllRegisteredPlugins()) {
         let id = plugin.getId();
         let name = plugin.getName();
         let metaData = typeof plugin.getMetaData === 'function' ? plugin.getMetaData() : {};
         let description = typeof (<any> plugin).getDescription === 'function' ? (<any> plugin).getDescription() : metaData.description;

         let checkboxElement = $('<input>');
         checkboxElement.attr('type', 'checkbox');
         checkboxElement.attr('id', id);
         checkboxElement.attr('name', name);
         checkboxElement.prop('checked', disabledPlugins.indexOf(id) < 0);

         //check if libsignal is available
         if (id === 'omemo' && typeof (<any>window).libsignal === 'undefined') {
            checkboxElement.prop('checked', false);
            checkboxElement.prop('disabled', true);
         }

         checkboxElement.on('change', (ev) => {
            let isEnabled = $(ev.target).prop('checked');
            let id = $(ev.target).attr('id');
            let disabledPlugins = this.account.getOption('disabledPlugins') || [];

            if (isEnabled) {
               disabledPlugins = disabledPlugins.filter(v => v !== id);
            } else {
               disabledPlugins.push(id);
            }

            this.account.setOption('disabledPlugins', disabledPlugins);
         });

         let listItem = new ListItem(name, description, undefined, undefined, checkboxElement);
         let listItemElement = listItem.getDOM();

         if (Array.isArray(metaData.xeps)) {
            metaData.xeps.forEach(xep => {
               let xepElement = $('<a target="_blank" rel="noreferrer noopener">');
               xepElement.addClass('jsxc-badge');
               xepElement.text(xep.id + '@' + xep.version);
               xepElement.attr('title', xep.name);
               xepElement.attr('href', `https://xmpp.org/extensions/${xep.id.toLowerCase()}.html`);
               xepElement.appendTo(listItemElement.find('.jsxc-list__text__primary'));
            });
         }

         contentElement.append(listItem);
      }

      return contentElement.getDOM();
   }
}
