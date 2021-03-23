import ConfirmDialog from '@ui/dialogs/confirm';
import Translation from '@util/Translation';
import { SOUNDS } from './CONST';
import { IContact } from './Contact.interface';
import Notification from './Notification';
import RoleAllocator from './RoleAllocator';
import IStorage from './Storage.interface';
import { CallState, CallType } from './CallManager';

export class Call {
   private confirmPromise: Promise<void>;

   private abortResolve: (value: void) => void;

   private state = CallState.Pending;

   private storage: IStorage;

   private key: string;

   constructor(private type: CallType, private sessionId: string, private peer: IContact) {
      this.storage = this.peer.getAccount().getSessionStorage();
      this.key = this.storage.generateKey('call', this.sessionId);
   }

   public getPeer() {
      return this.peer;
   }

   public getCurrentState() {
      return this.state;
   }

   public async getState(): Promise<CallState> {
      if (this.state === CallState.Pending) {
         await this.showCallDialog();
      }

      return this.state;
   }

   public getType(): CallType {
      return this.type;
   }

   public abort() {
      if (this.state === CallState.Aborted) {
         return;
      }

      this.setState(CallState.Aborted);

      this.abortResolve && this.abortResolve();
   }

   private accept() {
      this.setState(CallState.Accepted);
   }

   private decline() {
      this.setState(CallState.Declined);
   }

   // private ignore() {
   //    this.setState(CallState.Ignored);
   // }
   private setState(state: CallState) {
      this.state = state;

      this.storage.setItem(this.key, this.state);
   }

   private showCallDialog() {
      if (!this.confirmPromise) {
         if (RoleAllocator.get().isMaster()) {
            this.informUser();
         }

         let confirmDialog = ConfirmDialog(this.getMessage());

         this.confirmPromise = Promise.race([
            confirmDialog
               .getPromise()
               .then(() => {
                  this.accept();
               })
               .catch(() => {
                  this.decline();
               }),
            new Promise<void>(resolve => {
               this.abortResolve = resolve;
            }),
         ]).then(() => {
            confirmDialog.close();

            this.stopInformUser();
         });
      }

      return this.confirmPromise;
   }

   private informUser() {
      Notification.notify({
         title: this.getTitle(),
         message: this.getMessage(),
         source: this.peer,
      });

      Notification.playSound(SOUNDS.CALL, true, true);
   }

   private stopInformUser() {
      Notification.stopSound();
   }

   private getTitle(): string {
      if (this.type === 'video') {
         return Translation.t('Incoming_video_call');
      }

      if (this.type === 'stream') {
         return Translation.t('Incoming_stream');
      }

      return Translation.t('Incoming_call');
   }

   private getMessage(): string {
      let peerName = this.peer.getName();

      if (this.type === 'video') {
         return `${Translation.t('Incoming_video_call')} ${Translation.t('from')} ${peerName}`;
      }

      if (this.type === 'stream') {
         return `${Translation.t('Incoming_stream')} ${Translation.t('from')} ${peerName}`;
      }

      return `${Translation.t('Incoming_call')} ${Translation.t('from')} ${peerName}`;
   }
}
