import Dialog from '../Dialog';
import Contact from '../../Contact'
import StorageSingleton from '../../StorageSingleton'

let fingerprintsTemplate = require('../../../template/fingerprints.hbs');

export default function(contact:Contact) {
   let storage = StorageSingleton.getUserStorage();
   let ownFingerprint = storage.getItem('ownOtrFingerprint').replace(/(.{8})/g, '$1 ');
   let theirFingerprint = contact.getFingerprint().replace(/(.{8})/g, '$1 ');

   let content = fingerprintsTemplate({
      ownFingerprint: ownFingerprint,
      theirFingerprint: theirFingerprint
   });

   let dialog = new Dialog(content);
   let dom = dialog.open();
}
