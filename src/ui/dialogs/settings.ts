import Dialog from '../Dialog'
import Client from '../../Client'
import Page from '../DialogPage'
import Section from '../DialogSection'
import Navigation from '../DialogNavigation'
import List from '../DialogList'
import ListItem from '../DialogListItem'
import AvatarSet from '../AvatarSet'
import Log from '../../util/Log'
import Contact from '@src/Contact';
import Translation from '@util/Translation';

const ENOUGH_BITS_OF_ENTROPY = 50;

export default function() {
   let dialog = new Dialog('', false, 'settings');
   let dom = dialog.open();

   let navigation = new Navigation(dom);
   navigation.goTo(new StartPage(navigation));
}

class StartPage extends Page {
   constructor(navigation: Navigation) {
      super(navigation, 'Settings');
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
}

class AccountOverviewSection extends Section {
   constructor(navigation: Navigation) {
      super(navigation, 'Accounts');
   }

   protected generateContentElement(): JQuery {
      let accounts = Client.getAccountManager().getAccounts();
      let contentElement = new List();

      for (let account of accounts) {
         let name = account.getJID().bare;
         let avatarElement = $('<div>');
         avatarElement.addClass('jsxc-avatar');
         AvatarSet.setPlaceholder(avatarElement, name);

         let actionHandler = () => this.navigation.goTo(new AccountPage(this.navigation, account));
         let accountElement = new ListItem(name, undefined, actionHandler, avatarElement);

         contentElement.append(accountElement);
      }

      return contentElement.getDOM();
   }
}

class AccountPage extends Page {
   constructor(navigation: Navigation, private account) {
      super(navigation, account.getJID().bare);
   }

   protected generateContentElement(): JQuery {
      let contentElement = $('<div>');

      contentElement.append(new ConnectionSection(this.navigation, this.account).getDOM());
      contentElement.append(new PluginSection(this.navigation, this.account).getDOM());

      return contentElement;
   }
}

//@REVIEW priorities? Are they still needed/used?
class ConnectionSection extends Section {
   constructor(navigation: Navigation, private account) {
      super(navigation, 'Connection');
   }

   protected generateContentElement(): JQuery {
      let jid = this.account.getJID();
      let contentElement = new List();

      let changeNicknameActionHandler = () => this.navigation.goTo(new NicknamePage(this.navigation, this.account));
      let changePasswordActionHandler = () => this.navigation.goTo(new PasswordPage(this.navigation, this.account));

      contentElement.append(new ListItem('Jabber ID', jid.bare));
      contentElement.append(new ListItem('Resource', jid.resource));
      contentElement.append(new ListItem('BOSH url', this.account.getConnectionUrl()));
      contentElement.append(new ListItem('Edit Nickname', this.account.getNickname(), changeNicknameActionHandler));
      contentElement.append(new ListItem('Change password', undefined, changePasswordActionHandler));

      return contentElement.getDOM();
   }
}

class NicknamePage extends Page {

   constructor(navigation: Navigation, private account) {
      super(navigation, 'Nickname');

   }

   protected generateContentElement(): JQuery {
      //@REVIEW maybe template
      let contentElement = $('<form>');
      contentElement.addClass('form-horizontal');
      contentElement.css('marginTop', '30px'); //@REVIEW

      let explanationElement = $(`<p class="jsxc-explanation">{{t "nickname_explanation"}}</p>`)

      let nicknameElement = $(`<div class="form-group">
         <label class="col-sm-4 control-label" for="jsxc-nickname">Nickname</label>
         <div class="col-sm-8">
            <input type="text" name="nickname" id="jsxc-nickname" class="form-control" required="required">
            <p class="jsxc-inputinfo"></p>
         </div>
      </div>`);

      let submitElement = $(`<div class="form-group">
         <div class="col-sm-offset-4 col-sm-8">
            <button disabled="disabled" class="jsxc-button jsxc-button--primary">Submit</button>
         </div>
      </div>`);

      let errorElement = $(`<div class="jsxc-alert jsxc-alert--warning jsxc-hidden"></div>`);

      contentElement.append(explanationElement);
      contentElement.append(nicknameElement);
      contentElement.append(submitElement);
      contentElement.append(errorElement);

      contentElement.find('input').on('input', function() {
         submitElement.find('button').prop('disabled', false);
      });

      contentElement.submit((ev) => {
         ev.preventDefault();

         let nickname = nicknameElement.find('input').val();

         this.account.setNickname(nickname);

         this.account.getConnection().changeNickname(nickname).then(() => {
            Log.debug('Nickname was changed');
         }).catch((errStanza) => {

            if (errStanza === TypeError) {
               throw errStanza;
            }

            errorElement.removeClass('jsxc-hidden');
            errorElement.text('Server error. Nickname was not changed.');

         });
      });

      return contentElement;
   }
}

class PasswordPage extends Page {
   constructor(navigation: Navigation, private account) {
      super(navigation, 'Password');
   }

   protected generateContentElement(): JQuery {
      //@REVIEW maybe template
      let contentElement = $('<form>');
      contentElement.addClass('form-horizontal');
      contentElement.css('marginTop', '30px'); //@REVIEW

      let explanationElement = $(`<p class="jsxc-explanation">{{t "password_explanation"}}</p>`)

      let passwordAElement = $(`<div class="form-group">
         <label class="col-sm-4 control-label" for="jsxc-password-A">Password</label>
         <div class="col-sm-8">
            <input type="password" name="password-A" id="jsxc-password-A" class="form-control" required="required">
            <p class="jsxc-inputinfo"></p>
         </div>
      </div>`);

      let passwordBElement = $(`<div class="form-group">
         <label class="col-sm-4 control-label" for="jsxc-password-B">Control</label>
         <div class="col-sm-8">
            <input type="password" name="password-B" id="jsxc-password-B" class="form-control" required="required">
            <p class="jsxc-inputinfo jsxc-hidden"></p>
         </div>
      </div>`);

      let submitElement = $(`<div class="form-group">
         <div class="col-sm-offset-4 col-sm-8">
            <button disabled="disabled" class="jsxc-button jsxc-button--primary">Change password</button>
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

         passwordAElement.find('.jsxc-inputinfo').text(`Strength: ${strength}%`);
      });

      contentElement.find('input').on('input', function() {
         let passwordA = passwordAElement.find('input').val();
         let passwordB = passwordBElement.find('input').val();

         submitElement.find('button').prop('disabled', passwordA !== passwordB)
      });

      contentElement.submit((ev) => {
         ev.preventDefault();

         let passwordA = passwordAElement.find('input').val();
         let passwordB = passwordBElement.find('input').val();

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

class PluginSection extends Section {
   constructor(navigation: Navigation, private account) {
      super(navigation, 'Plugins');
   }

   protected generateContentElement(): JQuery {
      let contentElement = new List();

      let disabledPlugins = this.account.getOption('disabledPlugins') || [];
      let pluginRepository = this.account.getPluginRepository();

      for (let plugin of pluginRepository.getAllEnabledRegisteredPlugins()) {
         let name = plugin.getName();
         let description = typeof plugin.getDescription === 'function' ? plugin.getDescription() : undefined;

         let checkboxElement = $('<input>');
         checkboxElement.attr('type', 'checkbox');
         checkboxElement.attr('name', name);
         checkboxElement.prop('checked', disabledPlugins.indexOf(name) < 0);
         checkboxElement.on('change', (ev) => {
            let isEnabled = $(ev.target).prop('checked');
            let name = $(ev.target).attr('name');
            let disabledPlugins = this.account.getOption('disabledPlugins') || [];

            if (isEnabled) {
               disabledPlugins = disabledPlugins.filter(v => v !== name);
            } else {
               disabledPlugins.push(name);
            }

            this.account.setOption('disabledPlugins', disabledPlugins);
         });

         let listItem = new ListItem(name, description, undefined, undefined, checkboxElement);

         contentElement.append(listItem);
      }

      return contentElement.getDOM();
   }
}
