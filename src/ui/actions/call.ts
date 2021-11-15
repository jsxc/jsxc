import { IContact } from '@src/Contact.interface';
import Log from '../../util/Log';
import UserMedia from '../../UserMedia';
import { VideoDialog } from '../VideoDialog';
import Account from '../../Account';
import Translation from '../../util/Translation';
import { JINGLE_FEATURES } from '@src/JingleAbstractSession';
import { CallState } from '@src/CallManager';

export async function startCall(contact: IContact, account: Account, type: 'video' | 'audio' | 'screen' = 'video') {
   let resources = await contact.getCapableResources(JINGLE_FEATURES[type]);

   if (resources.length === 0) {
      Log.debug('We need a full jid');

      contact.addSystemMessage(`No distinct JID available.`);

      return;
   }

   let reqMedia = type === 'audio' ? ['audio'] : type === 'screen' ? ['screen', 'audio'] : ['audio', 'video'];

   let stream: MediaStream;

   try {
      stream = await UserMedia.request(reqMedia);
   } catch ([msg, err]) {
      contact.addSystemMessage(`${Translation.t('Media_failure')}: ${msg} (${err.name})`);

      return;
   }

   let videoDialog = new VideoDialog();

   videoDialog.showVideoWindow(stream);
   videoDialog.setStatus('Initiate call');

   let callState = await account.getCallManager().call(contact, type, stream);

   if (callState === false) {
      contact.addSystemMessage(Translation.t('Couldnt_establish_connection'));

      videoDialog.close();
   } else if (callState !== null && typeof callState === 'object') {
      videoDialog.addSession(callState);

      if (type === 'screen') {
         videoDialog.minimize();
      }
   } else if (callState === CallState.Aborted) {
      videoDialog.close();

      contact.addSystemMessage(
         ':checkered_flag: ' +
            Translation.t(type === 'screen' ? 'Stream_terminated' : 'Call_terminated') +': '+
            Translation.t('Aborted')
      );
   } else if (callState === CallState.Declined) {
      videoDialog.close();

      contact.addSystemMessage(
         ':checkered_flag: ' +
            Translation.t(type === 'screen' ? 'Stream_terminated' : 'Call_terminated') +': '+
            Translation.t('Declined')
      );
   } else {
   }
}
