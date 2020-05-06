import { AbstractPlugin, IMetaData } from '../../plugin/AbstractPlugin'
import ChatWindow from '../../ui/ChatWindow'
import Translation from '../../util/Translation'
import PersistentMap from '../../util/PersistentMap'
import JID from '../../JID'
import { IJID } from '../../JID.interface'
import * as Namespace from '../../connection/xmpp/namespace'
import Archive from './Archive'
import Contact from '@src/Contact';
import PluginAPI from '@src/plugin/PluginAPI';
import { IContact } from '@src/Contact.interface';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const MAM1 = 'urn:xmpp:mam:1';
const MAM2 = 'urn:xmpp:mam:2';

Namespace.register('MAM1', MAM1);
Namespace.register('MAM2', MAM2);

export default class MessageArchiveManagementPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'mam';
   }

   public static getName(): string {
      return 'Message Archive Management';
   }

   public static getDescription(): string {
      return ;
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-mam-enable'),
         xeps: [{
            id: 'XEP-0313',
            name: 'Message Archive Management',
            version: '0.6.3',
         }]
      }
   }

   private archives: {[key: string]: Archive} = {};
   private queryContactRelation: PersistentMap;
   private supportCache: {[archiveJid: string]: string | boolean} = {};

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.queryContactRelation = new PersistentMap(pluginAPI.getStorage(), 'mam', 'query');

      pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow, contact: Contact) => {
         this.addLoadButtonIfEnabled(chatWindow, contact);
      });

      pluginAPI.registerChatWindowClearedHook((chatWindow: ChatWindow, contact: Contact) => {
         let archiveJid = this.getArchiveJid(contact);

         if (this.supportCache[archiveJid.bare]) {
            this.getArchive(contact.getJid()).clear();
         }
      });

      this.pluginAPI.getConnection().registerHandler(this.onMamMessage, null, 'message', null);
   }

   public getStorage() {
      return this.pluginAPI.getStorage();
   }

   public getConnection() {
      return this.pluginAPI.getConnection();
   }

   public addQueryContactRelation(queryId: string, contact: IContact) {
      this.queryContactRelation.set(queryId, contact.getJid().bare);
   }

   public removeQueryContactRelation(queryId: string) {
      this.queryContactRelation.remove(queryId);
   }

   public async determineServerSupport(archivingJid: IJID) {
      if (typeof this.supportCache[archivingJid.bare] !== 'undefined') {
         return this.supportCache[archivingJid.bare];
      }

      let discoInfoRepository = this.pluginAPI.getDiscoInfoRepository();

      let version: string | boolean = false;
      try {
         let discoInfo = await discoInfoRepository.getCapabilities(archivingJid);

         if (discoInfo && discoInfo.hasFeature(MAM2)) {
            version = MAM2;
         } else if (discoInfo && discoInfo.hasFeature(MAM1)) {
            version = MAM1;
         }
      } catch (err) {
         this.pluginAPI.Log.warn('Could not determine MAM server support:', err);
      }

      if (version) {
         this.pluginAPI.Log.debug(archivingJid.bare + ' supports ' + version);
      } else {
         this.pluginAPI.Log.debug(archivingJid.bare + ' has no support for MAM');
      }

      this.supportCache[archivingJid.bare] = version;

      return version;
   }

   private getArchiveJid(contact: Contact) {
      let jid = contact.isGroupChat() ? contact.getJid() : this.getConnection().getJID();

      return new JID(jid.bare);
   }

   private addLoadButtonIfEnabled(chatWindow: ChatWindow, contact: Contact) {
      let archivingJid = this.getArchiveJid(contact);

      this.determineServerSupport(archivingJid).then((version) => {
         if (version) {
            this.addLoadButton(chatWindow.getDom(), contact);
         }
      });
   }

   private addLoadButton(chatWindowElement: JQuery<HTMLElement>, contact: Contact) {
      let classNameShow = 'jsxc-show';
      let classNameMamEnable = 'jsxc-mam-enabled';
      let messageAreaElement = chatWindowElement.find('.jsxc-message-area');
      let fadeElement = chatWindowElement.find('.jsxc-window-fade');

      let archive = this.getArchive(contact.getJid());

      let element = $('<div>');
      element.addClass('jsxc-mam-load-more');
      element.appendTo(fadeElement);
      let spanElement = $('<span>').text(Translation.t('Load_older_messages'));
      spanElement.click(() => {
         archive.nextMessages();
      });
      element.append(spanElement);

      messageAreaElement.scroll(function() {
         if (this.scrollTop < 42 && !archive.isExhausted()) {
            element.addClass(classNameShow);
         } else {
            element.removeClass(classNameShow);
         }
      });

      messageAreaElement.scroll();

      if (!archive.isExhausted()) {
         chatWindowElement.addClass(classNameMamEnable);
      }

      archive.registerExhaustedHook((isExhausted) => {
         if (isExhausted) {
            chatWindowElement.removeClass(classNameMamEnable);
         } else {
            chatWindowElement.addClass(classNameMamEnable);
            messageAreaElement.scroll();
         }
      });
   }

   private onMamMessage = (stanza: string): boolean => {
      let stanzaElement = $(stanza);
      let resultElement = stanzaElement.find(`result[xmlns^="urn:xmpp:mam:"]`);
      let queryId = resultElement.attr('queryid');

      if (resultElement.length !== 1 || !queryId) {
         return true;
      }

      let forwardedElement = resultElement.find('forwarded[xmlns="urn:xmpp:forward:0"]');

      if (forwardedElement.length !== 1) {
         return true;
      }

      let bareJid = this.queryContactRelation.get(queryId);

      if (!bareJid) {
         return true;
      }

      let jid = new JID(bareJid);

      this.getArchive(jid).onForwardedMessage(forwardedElement);

      return true;
   }

   public getArchive(jid: IJID) {
      if (!this.archives[jid.bare]) {
         this.archives[jid.bare] = new Archive(this, this.pluginAPI.getContact(jid));
      }

      return this.archives[jid.bare];
   }
}
