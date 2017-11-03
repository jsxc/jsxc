import Client from '../Client'
import Options from '../Options'
import * as CONST from '../CONST'
import Message from '../Message'

function addPrivateCarbonHint(message: Message, xmlMsg: Strophe.Builder): void {
   let body = xmlMsg.node.textContent;

   if (Options.get('carbons').enabled && body.match(/^\?OTR/)) {
      xmlMsg.up().c("private", {
         xmlns: CONST.NS.CARBONS
      });
   }
}

Client.addPreSendMessageHook(addPrivateCarbonHint);
