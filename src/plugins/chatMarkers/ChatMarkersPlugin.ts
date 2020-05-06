import * as Namespace from '@src/connection/xmpp/namespace'
import { ContactSubscription } from '@src/Contact.interface'
import JID from '@src/JID'
import { IJID } from '@src/JID.interface'
import Message from '@src/Message'
import { DIRECTION } from '@src/Message.interface'
import { AbstractPlugin, IMetaData } from '@src/plugin/AbstractPlugin'
import PluginAPI from '@src/plugin/PluginAPI'
import ChatWindow from '@src/ui/ChatWindow'
import Translation from '@src/util/Translation'
import { $msg } from '@src/vendor/Strophe'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

// frequently used strings
const CHATMARKERS = 'CHATMARKERS';
const MARKABLE = 'markable';
const RECEIVED = 'received';
const DISPLAYED = 'displayed';
const ACKNOWLEDGED = 'acknowledged';
const ID = 'id';
const FROM = 'from';

export default class ChatMarkersPlugin extends AbstractPlugin {

   public static getId(): string {
      return 'chat-markers';
   }

   public static getName(): string {
      return 'Chat Markers';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('chatmarkers-description'),
         xeps: [{
            id: 'XEP-0333',
            name: 'Chat Markers',
            version: '0.3',
         }]
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register(CHATMARKERS, 'urn:xmpp:chat-markers:0');

      this.pluginAPI.addFeature(Namespace.get(CHATMARKERS));

      this.pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      this.pluginAPI.getConnection().registerHandler(this.onChatMarkersMessage, null, 'message');

      this.pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow) => {
         this.chatWindowInitializedHook(chatWindow);
      });
   }

   private async supportsChatMarkers(jid: IJID) {
      if (jid.isBare()) {
         // if bare JID, sender MAY send chat markers

         return true;
      }

      // if full JID, sender SHOULD try to determine if recipient supports chat markers
      let repository = this.pluginAPI.getDiscoInfoRepository();

      try {
         return repository.hasFeature(jid, [Namespace.get(CHATMARKERS)]);
      } catch (err) {
         return false;
      }
   }

   private hasSubscription(jid: IJID): boolean {
      let contact = this.pluginAPI.getContact(jid);
      if (!contact) {
         return false;
      }

      let subscription = contact.getSubscription();

      return subscription === ContactSubscription.FROM
      || subscription === ContactSubscription.BOTH;
   }

   // add "markable" element according to XEP-0333
   private addMarkable(xmlStanza: Strophe.Builder) {
      xmlStanza.c(MARKABLE, {
         xmlns: Namespace.get(CHATMARKERS)
      }).up();
   }

   // send "received" message according to XEP-0333
   private sendReceived(lastReceivedMsgId: string, to: IJID) {
      this.pluginAPI.Log.debug(`sending ${RECEIVED} message. Yaay! =)`);

      this.pluginAPI.send($msg({
         to: to.full,
         type: 'chat',
      }).c(RECEIVED, {
         xmlns: Namespace.get(CHATMARKERS),
         id: lastReceivedMsgId
      }).up().c('store', {
         xmlns: 'urn:xmpp:hints'
      }));
   }

   // send "displayed" message according to XEP-0333
   private sendDisplayed(lastDisplayedMsgId: string, to: IJID) {
      this.pluginAPI.Log.debug(`sending ${DISPLAYED} message. Yaay! =)`);

      this.pluginAPI.send($msg({
         to: to.full,
         type: 'chat',
      }).c(DISPLAYED, {
         xmlns: Namespace.get(CHATMARKERS),
         id: lastDisplayedMsgId
      }).up().c('store', {
         xmlns: 'urn:xmpp:hints'
      }));
   }

   // send "acknowledged" message according to XEP-0333
   // private sendAcknowledged(lastAcknowledgedMsgId: string, to: IJID) {
   //    this.pluginAPI.Log.debug(`sending ${ACKNOWLEDGED} message. Yaay! =)`);

   //    this.pluginAPI.send($msg({
   //       to: to.full
   //    }).c(ACKNOWLEDGED, {
   //       xmlns: Namespace.get(CHATMARKERS),
   //       id: lastAcknowledgedMsgId
   //    }).up().c('store', {
   //    xmlns: 'urn:xmpp:hints'
   // }));
   // }

   private preSendMessageStanzaProcessor = (msg: Message, stanza: Strophe.Builder): Promise<any> => {
      if (msg.getType() === Message.MSGTYPE.CHAT) {
         return this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
            if (hasFeature) {
               this.addMarkable(stanza);
            }

            return [msg, stanza];
         });
      }

      return Promise.resolve([msg, stanza]);
   }

   private onChatMarkersMessage = (stanza: string) => {
      let stanzaElement = $(stanza);
      let markerElement = stanzaElement.find(Namespace.getFilter(CHATMARKERS));

      if (markerElement.length === 0) {
         return true;
      }

      let mamResultElement = stanzaElement.find(Namespace.getFilter('MAM2', 'result')) ||
         stanzaElement.find(Namespace.getFilter('MAM1', 'result'));
      let isMam = mamResultElement.length > 0;

      let carbonReceivedElement = stanzaElement.find(Namespace.getFilter('CARBONS', 'received'));
      let carbonSentElement = stanzaElement.find(Namespace.getFilter('CARBONS', 'sent'));
      let isCarbon = carbonReceivedElement.length > 0 || carbonSentElement.length > 0;

      if (isCarbon && stanzaElement.attr('from') !== this.pluginAPI.getConnection().getJID().bare) {
         this.pluginAPI.Log.warn(`Received carbon copy from "${stanzaElement.attr('from')}". Ignoring.`);

         return true;
      }

      let messageElement: JQuery<HTMLElement>;

      if (carbonReceivedElement.length > 0) {
         messageElement = carbonReceivedElement.find('message');
      } else if (carbonSentElement.length > 0) {
         messageElement = carbonSentElement.find('message');
      } else if (mamResultElement.length > 0) {
         messageElement = mamResultElement.find('message');
      } else {
         messageElement = stanzaElement;
      }

      let idAttr = messageElement.attr(ID);
      let fromAttr = messageElement.attr(FROM);
      let toAttr = messageElement.attr('to');
      let typeAttr = stanzaElement.attr('type');

      let markableMessageId = markerElement.attr(ID);
      let marker = markerElement.prop('tagName').toLowerCase() as string;

      this.pluginAPI.Log.debug(`"${marker}" marker received from "${fromAttr}" to "${toAttr}"`);

      if ([MARKABLE, RECEIVED, DISPLAYED, ACKNOWLEDGED].indexOf(marker) < 0) {
         this.pluginAPI.Log.info(`"${marker}" is no valid marker`);

         return true;
      }

      if (marker === MARKABLE) {
         if (!idAttr || !fromAttr) {
            return true;
         }

         if ($(stanza).attr('type') !== Message.MSGTYPE.GROUPCHAT && !isCarbon && !isMam) {
            let peer = new JID(fromAttr);

            this.sendReceived(idAttr, peer);
         }
      } else {
         if (!markableMessageId || !fromAttr) {
            return true;
         }

         if (typeAttr !== Message.MSGTYPE.GROUPCHAT) {
            let peerJid = new JID(carbonSentElement.length > 0 ? toAttr : fromAttr);
            let direction = carbonSentElement.length > 0 ? DIRECTION.IN : DIRECTION.OUT;

            this.markMessages(markableMessageId, peerJid, marker, direction);
         }
      }

      return true;
   }

   private markMessages(markableMessageId: string, peer: IJID, status: string, direction: DIRECTION) {
      let contact = this.pluginAPI.getContact(peer);

      if (!contact) {
         return;
      }

      let transcript = contact.getTranscript();
      let msg = transcript.getFirstMessage();

      while (msg && msg.getAttrId() !== markableMessageId) {
         try {
            msg = transcript.getMessage(msg.getNextId());
         } catch (error) {
            msg = undefined;

            break;
         }
      }

      // @REVIEW spec is not clear if only markable message from the same resource should be marked
      while (!!msg) {
         if (msg.getDirection() === direction && msg.isTransferred()) {
            if (status === RECEIVED) {
               if (msg.isReceived()) {
                  // no need to traverse all messages
                  break;
               }

               msg.received();
            } else if (status === DISPLAYED) {
               if (msg.isDisplayed()) {
                  break;
               }

               msg.read();
               msg.displayed();
            } else if (status === ACKNOWLEDGED) {
               if (msg.isAcknowledged()) {
                  break;
               }

               msg.read();
               msg.acknowledged();
            }
         }

         try {
            msg = transcript.getMessage(msg.getNextId());
         } catch (error) {
            break;
         }
      }
   }

   private chatWindowInitializedHook(chatWindow: ChatWindow) {
      let windowElement = chatWindow.getDom().find('.jsxc-message-input');

      windowElement.on('focus', () => this.onChatWindowFocus(chatWindow));
   }

   private onChatWindowFocus = (chatWindow: ChatWindow) => {
      let transcript = chatWindow.getTranscript();
      let msg = transcript.getFirstMessage();

      while (!!msg) {
         if (msg.getDirection() === DIRECTION.IN && msg.getType() !== Message.MSGTYPE.GROUPCHAT) {
            if (!msg.isDisplayed()) {
               this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
                  if (hasFeature && this.hasSubscription(msg.getPeer())) {
                     this.sendDisplayed(msg.getAttrId(), msg.getPeer());
                  }
               });

               msg.displayed();
            }

            break;
         } else {
            msg = transcript.getMessage(msg.getNextId());
         }
      }
   }
}
