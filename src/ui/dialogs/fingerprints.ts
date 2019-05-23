import Dialog from '../Dialog'

let fingerprintsTemplate = require('../../../template/fingerprints.hbs');

export default function(ownFingerprint: string, theirFingerprint: string) {
   let content = fingerprintsTemplate({
      ownFingerprint: ownFingerprint.replace(/(.{8})/g, '$1 '),
      theirFingerprint: theirFingerprint.replace(/(.{8})/g, '$1 ')
   });

   let dialog = new Dialog(content);
   dialog.open();
}
