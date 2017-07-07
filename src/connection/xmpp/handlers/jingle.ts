import Client from '../../../Client';

export default function(stanza:Element) {
   let account = Client.getAccout();
   let connection = account.getConnection();
   let storage = account.getStorage();

   storage.setItem('stanzaJingle', stanza.outerHTML);
   storage.removeItem('stanzaJingle');

   connection.getJingleHandler().onJingle(stanza);

   return true;
}
