import Dialog from '../Dialog';
import { IMessage } from '@src/Message.interface';
import ChatWindowMessage from '@ui/ChatWindowMessage';
import ChatWindow from '@ui/ChatWindow';

const messageHistoryTemplate = require('../../../template/messageHistory.hbs');

export default function messageHistory(message: IMessage, chatWindow: ChatWindow) {
   const content = messageHistoryTemplate({});

   const dialog = new Dialog(content);
   const dom = dialog.open();

   while (message) {
      const messageElement = new ChatWindowMessage(message, chatWindow, false);

      dom.find('ul').append('<li>');
      dom.find('ul > li:last-child').append(messageElement.getElement());

      message = message.getReplacedBy();
   }
}
