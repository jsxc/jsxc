import SelectionDialog from './selection';
import Translation from '@util/Translation';
import Contact from '@src/Contact';
import JID from '@src/JID';
import Client from '@src/Client';

export default function(accountId: string, header: string, description: string, fromString: string) {
   SelectionDialog({
      header,
      message: description,
      primary: {
         label: Translation.t('Open_window'),
         cb: () => {
            let jid = new JID(fromString);
            let account = Client.getAccountManager().getAccount(accountId);

            if (!account) {
               return;
            }

            let contact = new Contact(account, jid);

            account.getContactManager().addToCache(contact);

            contact.getChatWindowController().openProminently();
         }
      },
      option: {
         cb: () => undefined,
      }
   });
}
