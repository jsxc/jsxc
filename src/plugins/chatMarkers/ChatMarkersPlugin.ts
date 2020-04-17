import { ContactSubscription } from '@src/Contact.interface'
import { IJID } from '@src/JID.interface'
import JID from '@src/JID'
import { DIRECTION } from '@src/Message.interface'
import Message from '@src/Message'
import * as Namespace from '@src/connection/xmpp/namespace'
import { AbstractPlugin } from '@src/plugin/AbstractPlugin'
import PluginAPI from '@src/plugin/PluginAPI'
import ChatWindow from '@src/ui/ChatWindow'
import PersistentMap from '@src/util/PersistentMap'
import Translation from '@src/util/Translation'
import { $msg } from '@src/vendor/Strophe'

/**
 * XEP-0333: Chat Markers
 *
 * @version 0.3
 * @see http://xmpp.org/extensions/xep-0333.html
 */

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

// frequently used strings
const CHATMARKERS = 'CHATMARKERS';
const MARKABLE = 'markable';
const RECEIVED = 'received';
const DISPLAYED = 'displayed';
const ACKNOWLEDGED = 'acknowledged';
const ID = 'id';
const FROM = 'from';

enum ChatMarkerStatus {
   RECEIVED,
   DISPLAYED,
   ACKNOWLEDGED
}

export default class ChatMarkersPlugin extends AbstractPlugin {

   private data: PersistentMap;

   public static getId(): string {
      return 'chat-markers';
   }

   public static getName(): string {
      return 'Chat Markers';
   }

   public static getDescription(): string {
      return Translation.t('chatmarkers-description');
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register(CHATMARKERS, 'urn:xmpp:chat-markers:0');

      this.pluginAPI.addFeature(Namespace.get(CHATMARKERS));

      this.data = new PersistentMap(this.pluginAPI.getStorage(), 'chatmarkers');

      this.pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      this.pluginAPI.getConnection().registerHandler(this.onMarkableMessage, null, 'message');
      this.pluginAPI.getConnection().registerHandler(this.onChatMarkersMessage, null, 'message');

      this.pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow) => {
         this.chatWindowInitializedHook(chatWindow);
      });
   }

   private supportsChatMarkers(jid: IJID) {
      if (jid.isBare()) {
         // if bare JID, sender MAY send chat markers
         this.pluginAPI.Log.debug(`${jid.full} supports chat markers. Yaay! =)`);

         return Promise.resolve(true);
      } else {
         // if full JID, sender SHOULD try to determine if recipient supports chat markers
         return this.pluginAPI.getDiscoInfoRepository().hasFeature(jid, [Namespace.get(CHATMARKERS)]).then((hasFeature) => {
            if (hasFeature) {
               this.pluginAPI.Log.debug(`${jid.full} supports chat markers. Yaay! =)`);
            } else {
               this.pluginAPI.Log.debug(`${jid.full} doesn't support chat markers. =(`);
            }

            return hasFeature;
         }).catch(() => {
            this.pluginAPI.Log.debug(`${jid.full} doesn't support chat markers. =(`);

            return false;
         });
      }
   }

   private hasSubscription(jid: IJID): boolean {
      let contact = this.pluginAPI.getContact(jid);
      if (!contact) {
         return false;
      }
      let subscription = contact.getSubscription();
      if (subscription === ContactSubscription.FROM
         || subscription === ContactSubscription.BOTH) {
         return true;
      } else {
         return false;
      }
   }

   // add "markable" element according to XEP-0333
   private addMarkable(xmlStanza: Strophe.Builder, msg: Message) {
      this.pluginAPI.Log.debug(`adding ${MARKABLE} tag. Yaay! =)`);

      xmlStanza.c(MARKABLE, {
         xmlns: Namespace.get(CHATMARKERS)
      }).up();
   }

   // send "received" message according to XEP-0333
   private sendReceived(lastReceivedMsgId: string, to: IJID) {
      this.pluginAPI.Log.debug(`sending ${RECEIVED} message. Yaay! =)`);

      this.pluginAPI.send($msg({
         to: to.full
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
         to: to.full
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
      this.pluginAPI.Log.debug('pre send message stanza processor. Yaay! =)');

      if (msg.getType() === Message.MSGTYPE.CHAT) {
         return this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
            if (hasFeature) {
               this.addMarkable(stanza, msg);
            }

            return [msg, stanza];
         });
      }

      return Promise.resolve([msg, stanza]);
   }

   // send "received" on "markable" message according to XEP-0333
   private onMarkableMessage = (stanza: string) => {
      this.pluginAPI.Log.debug('onMarkableMessage');

      let element = $(stanza).find(MARKABLE + Namespace.getFilter(CHATMARKERS));

      if (element.length <= 0) {
         return;
      }

      this.pluginAPI.Log.debug(`message has "${MARKABLE}" element. Yaay! =)`);

      let msgId = $(stanza).attr(ID);
      if (!msgId) {
         return;
      }

      this.pluginAPI.Log.debug(`message has "${ID}" attribute (${ID}: ${msgId}). Yaay! =)`);

      let from = $(stanza).attr(FROM);

      if (!from) {
         return;
      }

      this.pluginAPI.Log.debug(`message has "${FROM}" attribute (${FROM}: ${from}). Yaay! =)`);

      if ($(stanza).attr('type') !== Message.MSGTYPE.GROUPCHAT) {
         let peer = new JID(from);

         this.sendReceived(msgId, peer);
      }

      return true;
   }

   // get chat marker type
   private onChatMarkersMessage = (stanza: string) => {
      let element = $(stanza).find(RECEIVED + Namespace.getFilter(CHATMARKERS));
      if (element.length !== 0) {
         this.pluginAPI.Log.debug(`message has "${RECEIVED}" element. Yaay! =)`);
         this.setMessagesChatMarkers(element.attr(ID), $(stanza).attr(FROM), $(stanza).attr('type'), ChatMarkerStatus.RECEIVED);
      } else {
         element = $(stanza).find(DISPLAYED + Namespace.getFilter(CHATMARKERS));
         if (element.length !== 0) {
            this.pluginAPI.Log.debug(`message has "${DISPLAYED}" element. Yaay! =)`);
            this.setMessagesChatMarkers(element.attr(ID), $(stanza).attr(FROM), $(stanza).attr('type'), ChatMarkerStatus.DISPLAYED);
         } else {
            element = $(stanza).find(ACKNOWLEDGED + Namespace.getFilter(CHATMARKERS));
            if (element.length !== 0) {
               this.pluginAPI.Log.debug(`message has "${ACKNOWLEDGED}" element. Yaay! =)`);
               this.setMessagesChatMarkers(element.attr(ID), $(stanza).attr(FROM), $(stanza).attr('type'), ChatMarkerStatus.ACKNOWLEDGED);
            }
         }
      }
      return true;
   }

   // mark messages, depending on the chat marker we get, according to XEP-0333
   private setMessagesChatMarkers(msgId: string, from: string, msgType: string, status: ChatMarkerStatus) {
      if (!msgId) {
         return;
      }
      this.pluginAPI.Log.debug(`message has "${ID}" attribute (${ID}: ${msgId}). Yaay! =)`);
      if (!from) {
         return;
      }
      this.pluginAPI.Log.debug(`message has "${FROM}" attribute (${FROM}: ${from}). Yaay! =)`);
      if (msgType !== Message.MSGTYPE.GROUPCHAT) {
         this.markMessages(msgId, new JID(from), DIRECTION.OUT, status);
      }
   }

   private markMessages(msgId: string, from: IJID, msgDirection: DIRECTION, status: ChatMarkerStatus) {
      let contact = this.pluginAPI.getContact(from);

      if (!contact) {
         return;
      }

      let transcript = contact.getChatWindow().getTranscript();
      let msg = transcript.getMessage(msgId);

      // @REVIEW spec is not clear if only markable message from the same resource should be marked
      while (!!msg) {
         if (msg.getDirection() === msgDirection) {
            if (status === ChatMarkerStatus.RECEIVED) {
               if (msg.isReceived()) {
                  // no need to traverse all messages
                  break;
               }

               msg.received();
            } else if (status === ChatMarkerStatus.DISPLAYED) {
               if (msg.isDisplayed()) {
                  break;
               }

               msg.displayed();
            } else if (status === ChatMarkerStatus.ACKNOWLEDGED) {
               if (msg.isAcknowledged()) {
                  break;
               }

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
      this.pluginAPI.Log.debug('chat window initialized hook. Yaay! =)');

      let windowElement = chatWindow.getDom().find('.jsxc-message-input');

      windowElement.on('focus', () => this.onChatWindowFocus(chatWindow));
   }

   private onChatWindowFocus = (chatWindow: ChatWindow) => {
      this.pluginAPI.Log.debug(`"on" handler on jsxc-window with event ${event.type}. Yaay! =)`);

      let transcript = chatWindow.getTranscript();
      let msg = transcript.getFirstMessage();

      while (!!msg) {
         if (msg.getDirection() === DIRECTION.IN && msg.getType() !== Message.MSGTYPE.GROUPCHAT) {
            if (msg.getAttrId() !== this.data.get('lastDisplayedMsgId')) {
               this.data.set('lastDisplayedMsgId', msg.getAttrId());

               this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
                  if (hasFeature && this.hasSubscription(msg.getPeer())) {
                     this.sendDisplayed(msg.getAttrId(), msg.getPeer());
                  }
               });
            }
            break;
         } else {
            msg = transcript.getMessage(msg.getNextId());
         }
      }
   }
}
