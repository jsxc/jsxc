import Log from './util/Log'
import * as jsxc from './api/v1/index'
import Client from './Client';

export interface ISettings {
   disabled?: boolean,
   xmpp?: {
      url?: string,
      node?: string,
      domain?: string,
      password?: string,
      resource?: string,
   }
}

export type SettingsCallback = (username: string, password: string) => Promise<ISettings>;

export function usernameToJabberId(username: string, settings: ISettings) {
   let jid: string;

   if (settings.xmpp.node && settings.xmpp.domain) {
      jid = settings.xmpp.node + '@' + settings.xmpp.domain;
   } else if (username.indexOf('@') > -1) {
      jid = username;
   } else if (settings.xmpp.domain) {
      jid = username + '@' + settings.xmpp.domain;
   } else {
      throw new Error('Could not find any jid.');
   }

   if (settings.xmpp.resource && !/@(.+)\/(.+)$/.test(jid)) {
      jid = jid + '/' + settings.xmpp.resource;
   }

   return jid;
}

export default class FormWatcher {
   private formElement: JQuery;
   private usernameElement: JQuery;
   private passwordElement: JQuery;
   private settingsCallback: SettingsCallback;

   constructor(formElement: JQuery, usernameElement: JQuery, passwordElement: JQuery, settingsCallback?: SettingsCallback) {
      this.formElement = formElement;
      this.usernameElement = usernameElement;
      this.passwordElement = passwordElement;
      this.settingsCallback = settingsCallback || Client.getOption('loadConnectionOptions');

      if (formElement.length !== 1) {
         throw new Error(`Found ${formElement.length} form elements. I need exactly one.`);
      }

      if (usernameElement.length !== 1) {
         throw new Error(`Found ${usernameElement.length} username elements. I need exactly one.`);
      }

      if (passwordElement.length !== 1) {
         throw new Error(`Found ${passwordElement.length} password elements. I need exactly one.`);
      }

      if (typeof this.settingsCallback !== 'function') {
         throw new Error('I need a settings callback.');
      }

      this.prepareForm();
   }

   private prepareForm() {
      let formElement = this.formElement;
      let events = (<any> $)._data(formElement.get(0), 'events') || {
         submit: []
      };
      let submitEvents = [].concat(events.submit);

      formElement.data('submits', submitEvents);
      formElement.off('submit');

      formElement.submit((ev) => {
         ev.preventDefault();

         this.disableForm();

         this.onFormSubmit().then(() => {
            this.submitForm();
         }).catch((err) => {
            Log.warn(err);

            this.submitForm();
         });
      });

      Log.debug('Form watcher armed');
   }

   private async onFormSubmit() {
      let username = <string> this.usernameElement.val();
      let password = <string> this.passwordElement.val();

      let settings = await this.getSettings(username, password);

      if (typeof settings !== 'object' || settings === null) {
         throw new Error('No settings provided');
      }

      if (settings.disabled) {
         throw new Error('Duplex login disabled');
      }

      if (!settings.xmpp || !settings.xmpp.url) {
         throw new Error('I found no connection url');
      }

      if (settings.xmpp.password) {
         password = settings.xmpp.password;
      }

      let jid = usernameToJabberId(username, settings);

      return await jsxc.startAndPause(settings.xmpp.url, jid, password);
   }

   private getSettings(username: string, password: string): Promise<ISettings> {
      if (typeof this.settingsCallback !== 'function') {
         return Promise.resolve({});
      }

      return new Promise((resolve) => {
         let returnPromise = this.settingsCallback(username, password);

         if (returnPromise && typeof returnPromise.then === 'function') {
            resolve(returnPromise);
         } else {
            throw new Error('The settings callback isn\'t returning a promise');
         }
      });
   }

   private submitForm() {
      let formElement = this.formElement;

      formElement.off('submit');

      // Attach original events
      let submitEvents = formElement.data('submits') || [];
      submitEvents.forEach((handler) => {
         formElement.submit(handler);
      });

      this.enableForm();

      if (formElement.find('#submit').length > 0) {
         formElement.find('#submit').click();
      } else if (formElement.get(0) && typeof (<HTMLFormElement> formElement.get(0)).submit === 'function') {
         formElement.submit();
      } else if (formElement.find('[type="submit"]').length > 0) {
         formElement.find('[type="submit"]').click();
      } else {
         throw new Error('Could not submit login form.');
      }
   }

   private disableForm() {
      let formElement = this.formElement;

      formElement.find(':input').each(function() {
         let inputElement = $(this);

         if (inputElement.not(':disabled')) {
            inputElement.addClass('jsxc-disabled-during-login');
            inputElement.attr('disabled', 'disabled');
         }
      });
   }

   private enableForm() {
      let formElement = this.formElement;

      formElement.find('.jsxc-disabled-during-login').removeClass('jsxc-disabled-during-login').removeAttr('disabled');
   }
}
