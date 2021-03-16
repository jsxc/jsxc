import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Avatar from '../Avatar'
import AvatarUI from '../ui/AvatarSet'
import JID from '../JID'
import { ContactType, IContact } from '@src/Contact.interface';
import Translation from '@util/Translation';
import { IAvatar } from '@src/Avatar.interface'
import { IJID } from '@src/JID.interface'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class AvatarVCardPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'vcard-avatars';
   }

   public static getName(): string {
      return 'vCard-based Avatars';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-vcard-avatar-enable'),
         xeps: [{
            id: 'XEP-0153',
            name: 'vCard-Based Avatars',
            version: '1.1',
         }]
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onPresenceVCardUpdate, 'vcard-temp:x:update', 'presence');

      pluginAPI.addPublishAvatarProcessor(this.publishAvatarProcessor);
      pluginAPI.addAvatarProcessor(this.avatarProcessor);
   }

   private getStorage() {
      return this.pluginAPI.getStorage();
   }

   private onPresenceVCardUpdate = (stanza) => {
      let from = new JID($(stanza).attr('from'));
      let xVCard = $(stanza).find('x[xmlns="vcard-temp:x:update"]');

      if (xVCard.length > 0) {
         let photo = xVCard.find('photo');

         if (photo.length > 0) {
            let contact = this.pluginAPI.getContact(from);

            if (contact && contact.getType() === ContactType.GROUPCHAT && from.resource) {
               return true;
            }

            let sha1OfAvatar = photo.text()?.trim() || null;

            this.getStorage().setItem(from.bare, sha1OfAvatar); //@REVIEW use this as trigger for all tabs?

            if (!contact) {
               this.pluginAPI.Log.warn('No contact found for', from);
               return true;
            }

            let avatarUI = AvatarUI.get(contact);
            avatarUI.reload();
         }
      }

      return true;
   }

   private publishAvatarProcessor = (avatar: IAvatar | null): Promise<[IAvatar]> => {
      if (typeof avatar === 'undefined') {
         return Promise.resolve([avatar]);
      }

      const vcardService = this.pluginAPI.getConnection().getVcardService();
      const jid = this.pluginAPI.getConnection().getJID();

      return vcardService.setAvatar(jid, avatar?.getData(), avatar?.getType()).then(() => {
         this.getStorage().setItem(jid.bare, avatar?.getHash() || '');

         return [undefined];
      }).catch((err) => {
         this.pluginAPI.Log.error('Could not publish avatar', err);

         return [avatar];
      });
   }

   private avatarProcessor = async (contact: IContact, avatar: IAvatar): Promise<[IContact, IAvatar]> => {
      let storage = this.getStorage();
      let hash = storage.getItem(contact.getJid().bare);

      if (!hash || avatar) {
         return [contact, avatar];
      }

      try {
         avatar = new Avatar(hash);
      } catch (err) {
         try {
            const avatarObject = await this.getAvatar(contact.getJid());

            return [contact, new Avatar(hash, avatarObject.type, avatarObject.src)];
         } catch (err) {
            this.pluginAPI.Log.warn('Error during avatar retrieval', err)

            return [contact, avatar];
         }
      }

      return [contact, avatar];
   }

   private getAvatar(jid: IJID): Promise<{ src: string, type: string }> {
      let connection = this.pluginAPI.getConnection();

      return connection.getVcardService().loadVcard(jid).then(function (vcard) {
         if (vcard.PHOTO && vcard.PHOTO.src) {
            return vcard.PHOTO;
         }

         throw new Error('No photo available');
      });
   }
}
