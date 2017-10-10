import Contact from '../../Contact'
import Client from '../../Client'
import Options from '../../Options'
import * as CONST from '../../CONST'
import Message from '../../Message'
import {AbstractPlugin} from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import ChatWindow from '../../ui/ChatWindow'
import Translation from '../../util/Translation'
import Log from '../../util/Log'
import PersistentMap from '../../util/PersistentMap'
import Utils from '../../util/Utils'
import JID from '../../JID'
import * as Namespace from '../../connection/xmpp/namespace'
import Archive from './Archive'
import DiscoInfo from '../../DiscoInfo'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

const MAM1 = 'urn:xmpp:mam:1';
const MAM2 = 'urn:xmpp:mam:2';

export default class MessageArchiveManagementPlugin extends AbstractPlugin {
   public static getName():string {
      return 'mam';
   }

   private enabled = false;
   private archives = {};
   private queryContactRelation:PersistentMap;

   constructor(pluginAPI:PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.queryContactRelation = new PersistentMap(pluginAPI.getStorage(), 'mam', 'query');

      ChatWindow.HookRepository.registerHook('initialized', (chatWindow:ChatWindow, contact:Contact) => {
         this.addLoadButtonIfEnabled(chatWindow, contact);
      });

      ChatWindow.HookRepository.registerHook('cleared', (chatWindow:ChatWindow, contact:Contact) => {
         if (this.enabled) {
            this.getArchive(contact.getJid()).clear();
         }
      });

      this.determineServerSupport();
   }

   public getStorage() {
      return this.pluginAPI.getStorage();
   }

   public getConnection() {
      return this.pluginAPI.getConnection();
   }

   public addQueryContactRelation(queryId:string, contact:Contact) {
      this.queryContactRelation.set(queryId, contact.getJid().bare);
   }

   public removeQueryContactRelation(queryId:string) {
      this.queryContactRelation.remove(queryId);
   }

   private determineServerSupport() {
      //@TODO
      setTimeout(() => {
         let connection = this.pluginAPI.getConnection();
         let discoInfoRepository = Client.getAccount().getDiscoInfoRepository();
         let serverJid = new JID('', connection.getJID().domain, '') //@REVIEW

         discoInfoRepository.getCapabilities(serverJid).then((discoInfo:DiscoInfo) => {
            if (discoInfo.hasFeature(MAM2)) {
               Namespace.register('MAM', MAM2);
               return true;
            } else if(discoInfo.hasFeature(MAM1)) {
               Namespace.register('MAM', MAM1);
               return true;
            }
            return false;
         }).then((hasSupport) => {
            if (hasSupport) {
               Log.debug('Server supports ' + Namespace.get('MAM'));

               this.enabled = true;

               connection.registerHandler(this.onMamMessage, Namespace.get('MAM'), 'message', null);
            }
         });
      }, 2000);
   }

   private addLoadButtonIfEnabled(chatWindow:ChatWindow, contact:Contact) {
      if (!this.enabled) {
         let self = this;

         //@REVIEW event based?
         setTimeout(function check() {
            if (self.enabled) {
               self.addLoadButton(chatWindow.getDom(), contact);
            } else {
               setTimeout(check, 200);
            }
         }, 200);
      } else {
         this.addLoadButton(chatWindow.getDom(), contact);
      }
   }

   private addLoadButton(chatWindowElement:JQuery<HTMLElement>, contact:Contact) {
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
      element.disableSelection();

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

   private onMamMessage = (stanza:string):boolean => {
      let stanzaElement = $(stanza);
      let resultElement = stanzaElement.find('result' + Namespace.getFilter('MAM'));
      var queryId = resultElement.attr('queryid');

      if (resultElement.length !== 1 || !queryId) {
         return true;
      }

      let forwardedElement = resultElement.find('forwarded[xmlns="urn:xmpp:forward:0"]');

      if (forwardedElement.length !== 1) {
         return true;
      }

      let bareJid = this.queryContactRelation.get(queryId);

      if(!bareJid) {
         return true;
      }

      let jid = new JID(bareJid);

      this.getArchive(jid).onForwardedMessage(forwardedElement);

      return true;
   }

   public getArchive(jid:JID) {
      if (!this.archives[jid.bare]) {
         this.archives[jid.bare] = new Archive(this, this.pluginAPI.getContact(jid));
      }

      return this.archives[jid.bare];
   }
}
