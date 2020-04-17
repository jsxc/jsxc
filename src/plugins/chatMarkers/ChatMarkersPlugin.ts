import Contact from '@src/Contact'
import { ContactSubscription } from '@src/Contact.interface'
import { IJID } from '@src/JID.interface'
import JID from '@src/JID'
import { IMessage, DIRECTION } from '@src/Message.interface'
import Message from '@src/Message'
import * as Namespace from '@src/connection/xmpp/namespace'
import { AbstractPlugin } from '@src/plugin/AbstractPlugin'
import PluginAPI from '@src/plugin/PluginAPI'
import ChatWindow from '@src/ui/ChatWindow'
import ChatWindowMessage from '@src/ui/ChatWindowMessage'
import PersistentMap from '@src/util/PersistentMap'
import Translation from '@src/util/Translation'
import { $msg } from '@src/vendor/Strophe'
import CheckMarkGreen = require('../../../images/plugins/chatMarkers/chatmarkers_check_mark_green.svg')
import CheckMarkGrey = require('../../../images/plugins/chatMarkers/chatmarkers_check_mark_grey.svg')
import ClosedEnvelopeGreen = require('../../../images/plugins/chatMarkers/chatmarkers_closed_envelope_green.svg')
import OpenEnvelopeGreen = require('../../../images/plugins/chatMarkers/chatmarkers_open_envelope_green.svg')

/**
 * XEP-0333: Chat Markers
 *
 * @version 1.0
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
   private static readonly INDICATOR_TEMPLATE = require('../../../template/plugins/chatMarkers/chatmarkers-indicator.hbs');
   private static readonly ACKNOWLEDGE_TEMPLATE = require('../../../template/plugins/chatMarkers/chatmarkers-acknowledge.hbs');

   private data: PersistentMap;

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
      this.pluginAPI.addPreSendMessageProcessor(this.preSendMessageProcessor);
      this.pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor);

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
      }));
   }

   // send "acknowledged" message according to XEP-0333
   private sendAcknowledged(lastAcknowledgedMsgId: string, to: IJID) {
      this.pluginAPI.Log.debug(`sending ${ACKNOWLEDGED} message. Yaay! =)`);
      this.pluginAPI.send($msg({
         to: to.full
      }).c(ACKNOWLEDGED, {
         xmlns: Namespace.get(CHATMARKERS),
         id: lastAcknowledgedMsgId
      }));
   }

   private preSendMessageStanzaProcessor = (msg: Message, stanza: Strophe.Builder): Promise<any> => {
      this.pluginAPI.Log.debug('pre send message stanza processor. Yaay! =)');
      if (msg.getType() === Message.MSGTYPE.CHAT) {
         this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
            if (hasFeature) {
               this.addMarkable(stanza, msg);
            }
         })
      }
      return Promise.resolve([msg, stanza]);
   }

   private preSendMessageProcessor = (contact: Contact, msg: Message): Promise<any> => {
      this.pluginAPI.Log.debug('pre send message processor. Yaay! =)');
      if (msg.getType() === Message.MSGTYPE.CHAT) {
         this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
            if (hasFeature) {
               this.registerOutHooks(msg, contact.getChatWindow().getChatWindowMessage(msg));
            }
         });
      }
      return Promise.resolve([contact, msg]);
   }

   private afterReceiveMessageProcessor = (contact: Contact, msg: Message, stanza: Element): Promise<any> => {
      this.pluginAPI.Log.debug('after receive message processor. Yaay! =)');
      if (msg.getType() === Message.MSGTYPE.CHAT) {
         this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
            if (hasFeature) {
               this.addInIndicators(msg, contact.getChatWindow().getChatWindowMessage(msg));
               this.registerInHooks(msg, contact.getChatWindow().getChatWindowMessage(msg));
            }
         });
      }
      return Promise.resolve([contact, msg, stanza]);
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
         this.supportsChatMarkers(peer).then((hasFeature) => {
            if (hasFeature && this.hasSubscription(peer)) {
               this.sendReceived(msgId, peer);
            }
         });
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
      while (!!msg) {
         if (msg.getDirection() === msgDirection) {
            if (status === ChatMarkerStatus.RECEIVED) {
               msg.chatMarkersReceived();
            }
            if (status === ChatMarkerStatus.DISPLAYED) {
               msg.chatMarkersDisplayed();
            }
            if (status === ChatMarkerStatus.ACKNOWLEDGED) {
               msg.chatMarkersAcknowledged();
            }
         }
         try {
            msg = transcript.getMessage(msg.getNextId());
         } catch (error) {
            break;
         }
      }
   }

   private chatWindowInitializedHook(chatWindow?: ChatWindow) {
      this.pluginAPI.Log.debug('chat window initialized hook. Yaay! =)');
      this.registerIndicatorsAndHooks(chatWindow);
      this.registerDisplayedEventHandler(chatWindow);
   }

   private registerIndicatorsAndHooks(chatWindow: ChatWindow) {
      let transcript = chatWindow.getTranscript();
      let msg = transcript.getFirstMessage();
      while (!!msg) {
         let chatWindowMsg = chatWindow.getChatWindowMessage(msg);
         let element = chatWindowMsg.getElement();
         // check if groupchat
         let dataName = element.attr('data-name');
         if (!(!!dataName)) {
            if (msg.getDirection() === DIRECTION.OUT) {
               this.addOutIndicators(msg, chatWindowMsg);
               this.registerOutHooks(msg, chatWindowMsg);
            } else if (msg.getDirection() === DIRECTION.IN) {
               this.addInIndicators(msg, chatWindowMsg);
               this.registerInHooks(msg, chatWindowMsg);
            }
         }
         msg = transcript.getMessage(msg.getNextId());
      }
   }

   private registerDisplayedEventHandler(chatWindow: ChatWindow) {
      chatWindow.getDom().find('.jsxc-window').on('focusin keydown mousedown select', () => {
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
      });
   }

   private addOutIndicators(msg: IMessage, chatWindowMsg: ChatWindowMessage) {
      this.pluginAPI.Log.debug('adding out indicators. Yaay! =)');
      let element = chatWindowMsg.getElement();
      if (msg.isChatMarkersAcknowledged()) {
         element.addClass('jsxc-chatmarkers-acknowledged');
         element.append($(ChatMarkersPlugin.INDICATOR_TEMPLATE({
            title: Translation.t('chatmarkers-acknowledged'),
            src: CheckMarkGreen
         })));
      } else if (msg.isChatMarkersDisplayed()) {
         element.addClass('jsxc-chatmarkers-displayed');
         element.append($(ChatMarkersPlugin.INDICATOR_TEMPLATE({
            title: Translation.t('chatmarkers-displayed'),
            src: OpenEnvelopeGreen
         })));
      } else if (msg.isChatMarkersReceived()) {
         element.addClass('jsxc-chatmarkers-received');
         element.append($(ChatMarkersPlugin.INDICATOR_TEMPLATE({
            title: Translation.t('chatmarkers-received'),
            src: ClosedEnvelopeGreen
         })));
      }
   }

   private registerOutHooks(msg: IMessage, chatWindowMsg: ChatWindowMessage) {
      this.pluginAPI.Log.debug('registering out hooks. Yaay! =)');
      let element = chatWindowMsg.getElement();
      msg.registerHook('chatMarkersReceived', (chatMarkersReceived) => {
         if (chatMarkersReceived) {
            element.addClass('jsxc-chatmarkers-received');
            element.find('.jsxc-chatmarkers').remove();
            element.append($(ChatMarkersPlugin.INDICATOR_TEMPLATE({
               title: Translation.t('chatmarkers-received'),
               src: ClosedEnvelopeGreen
            })));
         }
      });
      msg.registerHook('chatMarkersDisplayed', (chatMarkersDisplayed) => {
         if (chatMarkersDisplayed) {
            element.removeClass('jsxc-chatmarkers-received');
            element.addClass('jsxc-chatmarkers-displayed');
            element.find('.jsxc-chatmarkers').remove();
            element.append($(ChatMarkersPlugin.INDICATOR_TEMPLATE({
               title: Translation.t('chatmarkers-displayed'),
               src: OpenEnvelopeGreen
            })));
         }
      });
      msg.registerHook('chatMarkersAcknowledged', (chatMarkersAcknowledged) => {
         if (chatMarkersAcknowledged) {
            element.removeClass('jsxc-chatmarkers-received');
            element.removeClass('jsxc-chatmarkers-displayed');
            element.addClass('jsxc-chatmarkers-acknowledged');
            element.find('.jsxc-chatmarkers').remove();
            element.append($(ChatMarkersPlugin.INDICATOR_TEMPLATE({
               title: Translation.t('chatmarkers-acknowledged'),
               src: CheckMarkGreen
            })));
         }
      });
   }

   private addInIndicators(msg: IMessage, chatWindowMsg: ChatWindowMessage) {
      this.pluginAPI.Log.debug('adding in indicators. Yaay! =)');
      let element = chatWindowMsg.getElement();
      if (msg.isChatMarkersAcknowledged()) {
         element.addClass('jsxc-chatmarkers-acknowledged');
         element.append($(ChatMarkersPlugin.ACKNOWLEDGE_TEMPLATE({
            title: Translation.t('chatmarkers-acknowledged'),
            src: CheckMarkGreen
         })));
      } else {
         element.append($(ChatMarkersPlugin.ACKNOWLEDGE_TEMPLATE({
            title: Translation.t('chatmarkers-acknowledge'),
            src: CheckMarkGrey
         })));
         element.find('.jsxc-chatmarkers-acknowledge').on('click', () => {
            if (msg.getType() !== Message.MSGTYPE.GROUPCHAT && msg.getAttrId() !== this.data.get('lastAcknowledgedMsgId')) {
               this.supportsChatMarkers(msg.getPeer()).then((hasFeature) => {
                  if (hasFeature && this.hasSubscription(msg.getPeer())) {
                     this.data.set('lastAcknowledgedMsgId', msg.getAttrId());
                     this.sendAcknowledged(msg.getAttrId(), msg.getPeer());
                     this.pluginAPI.Log.debug(`setting previous messages ${ACKNOWLEDGED}. Yaay! =)`);
                     this.markMessages(msg.getUid(), msg.getPeer(), DIRECTION.IN, ChatMarkerStatus.ACKNOWLEDGED);
                  }
               });
            }
         });
      }
   }

   private registerInHooks(msg: IMessage, chatWindowMsg: ChatWindowMessage) {
      this.pluginAPI.Log.debug('registering in hooks. Yaay! =)');
      let element = chatWindowMsg.getElement();
      msg.registerHook('chatMarkersAcknowledged', (chatMarkersAcknowledged) => {
         if (chatMarkersAcknowledged) {
            element.find('.jsxc-chatmarkers-acknowledge').off('click');
            element.removeClass('jsxc-chatmarkers-received');
            element.removeClass('jsxc-chatmarkers-displayed');
            element.addClass('jsxc-chatmarkers-acknowledged');
            element.find('.jsxc-chatmarkers').remove();
            element.append($(ChatMarkersPlugin.ACKNOWLEDGE_TEMPLATE({
               title: Translation.t('chatmarkers-acknowledged'),
               src: CheckMarkGreen
            })));
         }
      });
   }
}
