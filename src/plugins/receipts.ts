import Client from '../Client'
import Options from '../Options'
import * as CONST from '../CONST'
import Message from '../Message'

function addReceiptsRequest(message:Message, xmlMsg:Strophe.Builder):void {
   if (message.type === Message.CHAT && (message.receiver.isBare() || this.hasFeatureByJid(message.receiver, Strophe.NS.RECEIPTS))) {
      // Add request according to XEP-0184
      xmlMsg.up().c('request', {
         xmlns: Strophe.NS.RECEIPTS
      });
   }
}

Client.addPreSendMessageHook(addReceiptsRequest);
