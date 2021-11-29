import { AbstractPlugin, IMetaData } from '../../plugin/AbstractPlugin';
import ChatWindow from '../../ui/ChatWindow';
import Translation from '../../util/Translation';
import PersistentMap from '../../util/PersistentMap';
import JID from '../../JID';
import { IJID } from '../../JID.interface';
import * as Namespace from '../../connection/xmpp/namespace';
import Archive from './Archive';
import Contact from '@src/Contact';
import PluginAPI from '@src/plugin/PluginAPI';
import { IContact } from '@src/Contact.interface';
import Client from '@src/Client';

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
      return;
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-mam-enable'),
         xeps: [
            {
               id: 'XEP-0313',
               name: 'Message Archive Management',
               version: '0.6.3',
            },
         ],
      };
   }

   private archives: { [key: string]: Archive } = {};
   private queryContactRelation: PersistentMap;
   private supportCache: { [archiveJid: string]: string | boolean } = {};

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.queryContactRelation = new PersistentMap(pluginAPI.getStorage(), 'mam', 'query');

      pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow, contact: Contact) => {
         this.addLoadButtonIfEnabled(chatWindow, contact, true);
         if (contact.isGroupChat())
         {
            this.syncMUCConversation(contact);
         }
      });

      pluginAPI.registerConnectionHook((status:number, condition: string)=>{

         if (status===Strophe.Status.ATTACHED)
         {
            this.syncConversations();
         }
      });

      pluginAPI.registerChatWindowClearedHook((chatWindow: ChatWindow, contact: Contact) => {
         let archiveJid = this.getArchiveJid(contact);

         let fadeElement = chatWindow.getDom().find('.jsxc-window-fade');
         if (fadeElement.find('.jsxc-mam-load-more').length>0){
            fadeElement.find('.jsxc-mam-load-more').remove();
         }

         let messageAreaElement =  chatWindow.getDom().find('.jsxc-message-area');
         messageAreaElement.off('scroll');

         if (this.supportCache[archiveJid.bare]) {
            this.getArchive(contact.getJid()).clear();
         }

         setTimeout(()=>{
            this.addLoadButtonIfEnabled(chatWindow, contact,false);
         },500);

      });

      this.pluginAPI.getConnection().registerHandler(this.onMamMessage, null, 'message', null);
   }

   private syncMUCConversation(contact: IContact)
   {
      let archive = this.getArchive(contact.getJid());
      archive.lastMessages();
   }

   private syncConversations(){
      let account = Client.getAccountManager().getAccount();
      let storage = account.getStorage();
      let cachedRoster = storage.getItem('roster','cache') || [];

      for (let id of cachedRoster) {
         let jid = new JID(id);
         try
         {
            let contact = account.getContact(jid);
            while (contact===undefined)
            {
               setTimeout(()=>{this.syncConversations();},50);
               return;
            }
            let archive = this.getArchive(jid);
            archive.lastMessages();
         } catch (err) {
            console.error('Error while syncing conversation with user: '+id,err);
         }
      }
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

   private addLoadButtonIfEnabled(chatWindow: ChatWindow, contact: Contact, loadNow : boolean) {
      let archivingJid = this.getArchiveJid(contact);

      this.determineServerSupport(archivingJid).then(version => {
         if (version) {
            this.addLoadButton(chatWindow.getDom(), contact, loadNow);
         }
      });
   }

   private addLoadButton(chatWindowElement: JQuery<HTMLElement>, contact: Contact, loadNow : boolean) {
      let fadeElement = chatWindowElement.find('.jsxc-window-fade');
      if (fadeElement.find('.jsxc-mam-load-more').length>0){
         return;
      }
      let classNameShow = 'jsxc-show';
      let classNameMamEnable = 'jsxc-mam-enabled';
      let messageAreaElement = chatWindowElement.find('.jsxc-message-area');

      let archive = this.getArchive(contact.getJid());

      let element = $('<div>');
      element.addClass('jsxc-mam-load-more');
      element.appendTo(fadeElement);
      let spanElement = $('<span>').text(Translation.t('Load_older_messages'));
      spanElement.click(() => {
         archive.nextMessages();
      });
      element.append(spanElement);

      messageAreaElement.on('scroll', function() {

         let scrollHeight: number   = messageAreaElement[0].scrollHeight;
         let clientHeight : number  = messageAreaElement[0].clientHeight;
         let scrollTop : number     = messageAreaElement[0].scrollTop;
         if (scrollTop<0)
            scrollTop=scrollTop*(-1);

         let autoLoadOnScrollToTop = Client.getOption('autoLoadOnScrollToTop') || false;

         if (((clientHeight + 42 > scrollHeight - scrollTop) && !archive.isExhausted())||messageAreaElement.text().trim().length===0) {
            if (autoLoadOnScrollToTop)
            {
               archive.nextMessages();
            }

            element.addClass(classNameShow);
         } else {
            element.removeClass(classNameShow);
         }

      });

      if (loadNow) {
         messageAreaElement.trigger('scroll');
      }
      else {
         element.addClass(classNameShow);
      }

      if (!archive.isExhausted()) {
         chatWindowElement.addClass(classNameMamEnable);
      }

      archive.registerExhaustedHook(isExhausted => {
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

      let msg = forwardedElement.find('message');
      if (msg)
      {
         let to = new JID(msg.attr('to'));
         let from = new JID(msg.attr('from'));

         if (jid.bare!==to.bare&&jid.bare!==from.bare) //filter messages to himself
         {
            return true;
         }
      }

      this.getArchive(jid).onForwardedMessage(forwardedElement);

      return true;
   };

   public getArchive(jid: IJID) {
      if (!this.archives[jid.bare]) {
         this.archives[jid.bare] = new Archive(this, this.pluginAPI.getContact(jid));
      }

      return this.archives[jid.bare];
   }
}
