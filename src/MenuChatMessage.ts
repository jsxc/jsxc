import { IContact } from './Contact.interface';
import Menu from './Menu';
import MenuItemStaticFactory from './MenuItemStaticFactory';
import { IMessage } from './Message.interface';

function quoteMessage(contact: IContact, message: IMessage) {
   const chatWindow = contact.getChatWindow();
   const inputText = chatWindow.getInput();
   const quote = message
      .getPlaintextMessage()
      .split('\n')
      .map(line => '> ' + line)
      .join('\n');

   chatWindow.setInput(inputText + (!inputText || inputText.endsWith('\n\n') ? '' : '\n\n') + quote + '\n\n');
}

export default class MenuChatMessage extends Menu<[IContact, IMessage]> {
   constructor() {
      super([new MenuItemStaticFactory('core-quote', '', quoteMessage, 'quotation')]);
   }
}
