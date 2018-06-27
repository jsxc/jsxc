import Dialog from '../Dialog'
import Client from '../../Client'
import Page from '../DialogPage'
import Section from '../DialogSection'
import Navigation from '../DialogNavigation'
import List from '../DialogList'
import ListItem from '../DialogListItem'
import AvatarSet from '../AvatarSet'
import Translation from '../../util/Translation';

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
   protected generateContentElement(): JQuery | Array<JQuery> {
      return [
         new ClientSection(this.navigation).getDOM(),
         new AccountOverviewSection(this.navigation).getDOM()
      ];
   }
}

class ClientSection extends Section {
   protected generateContentElement(): JQuery {
      let contentElement = new List();

      //@REVIEW more generic? See PluginSection.
      let checkboxElement = $('<input>');
      checkboxElement.attr('type', 'checkbox');
      checkboxElement.prop('checked', Client.getOption('on-login'));
      checkboxElement.on('change', (ev) => {
         let isEnabled = $(ev.target).prop('checked');

         Client.setOption('on-login', isEnabled);
      });

      //@TODO only show if form watcher was used
      contentElement.append(new ListItem(Translation.t('On_login'), Translation.t('setting-explanation-login'), undefined, undefined, checkboxElement));

      return contentElement.getDOM();
   }
}

class AccountOverviewSection extends Section {
   constructor(navigation: Navigation) {
      super(navigation, 'Accounts');
   }

   protected generateContentElement(): JQuery {
      let accounts = Client.getAccounts();
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

//@TODO priorities? Are they still needed/used?
class ConnectionSection extends Section {
   constructor(navigation: Navigation, private account) {
      super(navigation, 'Connection');
   }

   protected generateContentElement(): JQuery {
      let jid = this.account.getJID();
      let contentElement = new List();

      contentElement.append(new ListItem('Jabber ID', jid.bare));
      contentElement.append(new ListItem('Resource', jid.resource));
      contentElement.append(new ListItem('BOSH url', this.account.getConnectionUrl()));

      return contentElement.getDOM();
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

