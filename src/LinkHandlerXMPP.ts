import { ILinkHandler } from './LinkHandler.interface';
import { IJID } from './JID.interface';
import JID from './JID';
import Client from './Client';
import { IContact } from './Contact.interface';
import Contact from './Contact';
import showMultiUserJoinDialog from './ui/dialogs/multiUserJoin'
import Log from '@util/Log';

export default class LinkHandlerXMPP implements ILinkHandler {
   private static instance: LinkHandlerXMPP;

   public static get(): LinkHandlerXMPP {
      if (!LinkHandlerXMPP.instance) {
         LinkHandlerXMPP.instance = new LinkHandlerXMPP();
      }

      return LinkHandlerXMPP.instance;
   }

   private constructor() {

   }

   public execute(uri: string) {
      if (!uri.startsWith('xmpp:')) {
         throw new Error('Uri has to start with xmpp:');
      }

      let payload = uri.replace(/^xmpp:/, '');
      let { jid, action, params } = this.parsePayload(payload);

      if (typeof this.queryActions[action] !== 'function') {
         throw new Error('Unsupported action');
      }

      return this.queryActions[action](jid, params);
   }

   public detect(element: JQuery = $('body')) {
      let self = this;

      element.find('a[href^="xmpp:"]').each(function() {
         self.processElement($(this));
      });
   }

   private processElement(element: JQuery) {
      let payload = element.attr('href').replace(/^xmpp:/, '');
      let { jid, action, params } = this.parsePayload(payload);

      if (typeof this.queryActions[action] === 'function') {
         element.addClass('jsxc-xmpp-scheme jsxc-xmpp-scheme--' + action);

         element.off('click').click((ev) => {
            ev.stopPropagation();
            ev.preventDefault();

            this.queryActions[action](jid, params);
         });

         //@TODO add presence info
      }
   }

   private parsePayload(href: string) {
      let jidString = href.split('?')[0];
      let action: string;
      let params = {};

      if (!/[^"&'\\\/:<>@\s]+@[\w-_.]+/.test(jidString)) {
         return {};
      }

      let jid = new JID(jidString);

      if (href.indexOf('?') < 0) {
         action = 'message';
      } else {
         let parts = href.substring(href.indexOf('?') + 1).split(';');
         action = parts[0];

         for (let i = 1; i < parts.length; i++) {
            let key = parts[i].split('=')[0];
            let value = (parts[i].indexOf('=') > 0) ? parts[i].substring(parts[i].indexOf('=') + 1) : null;

            params[decodeURIComponent(key)] = decodeURIComponent(value);
         }
      }

      return {
         jid,
         action,
         params,
      };
   }

   private queryActions = {
      /** xmpp:JID?message[;body=TEXT] */
      message: (jid: IJID, params?: { body: string }) => {
         let contact = this.searchContact(jid);

         if (typeof contact === 'undefined') {
            Log.info('Can not execute query action, because no account is connected');
            return false;
         }

         if (!contact) {
            let account = Client.getAccountManager().getAccount();

            contact = new Contact(account, jid);
            account.getContactManager().addToCache(contact);
         }

         contact.getChatWindowController().openProminently();

         if (params?.body) {
            contact.getChatWindow().appendTextToInput(params?.body);
         }

         return true;
      },

      /** xmpp:JID?join[;password=TEXT] */
      join: (jid: IJID, params?: { password: string }) => {
         let contact = this.searchContact(jid);

         if (typeof contact === 'undefined') {
            Log.info('Can not execute query action, because no account is connected');
            return false;
         }

         if (!contact) {
            showMultiUserJoinDialog(jid.domain, jid.node);
         } else {
            this.queryActions.message(jid);
         }

         return true;
      }
   }

   private searchContact(jid: IJID): IContact {
      let accounts = Client.getAccountManager().getAccounts();

      if (accounts.length === 0) {
         return undefined;
      }

      for (let account of accounts) {
         let contact = account.getContact(jid);

         if (contact) {
            return contact;
         }
      }

      return null;
   }
}
