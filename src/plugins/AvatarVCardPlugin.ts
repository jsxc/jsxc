import {PluginState, AbstractPlugin} from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Client from '../Client'
import Account from '../Account'
import Log from '../util/Log'
import Contact from '../Contact'
import Avatar from '../Avatar'
import AvatarUI from '../ui/AvatarSet'
import JID from '../JID'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class AvatarVCardPlugin extends AbstractPlugin {
   public static getName():string {
      return 'vCard-based Avatars';
   }

   constructor(pluginAPI:PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onPresenceVCardUpdate, 'vcard-temp:x:update', 'presence');

      pluginAPI.addAvatarProcessor(this.avatarProcessor, 50);
   }

   private getStorage() {
      return this.pluginAPI.getStorage();
   }

   private onPresenceVCardUpdate = (stanza) => {
      let from = new JID($(stanza).attr('from'));
      let xVCard = $(stanza).find('x[xmlns="vcard-temp:x:update"]');

      // @REVIEW groupchat? error?

      if (xVCard.length > 0) {
         var photo = xVCard.find('photo');

         if (photo.length > 0) {
            let sha1OfAvatar = photo.text();

            this.getStorage().setItem(from.bare, sha1OfAvatar);

            let contact = this.pluginAPI.getContact(from);
            let avatarUI = AvatarUI.get(contact);
            avatarUI.reload();
         }
      }

      return true;
   }

   private avatarProcessor = (contact:Contact, avatar:Avatar):Promise<any> => {
      let storage = this.getStorage();
      let hash = storage.getItem(contact.getJid().bare);

      if (!hash || avatar) {
         return Promise.resolve([contact, avatar]);
      }

      try {
         avatar = new Avatar(hash);
      } catch(err) {
         return this.getAvatar(contact.getJid()).then((avatarObject) => {
            return [contact, new Avatar(hash, avatarObject.type, avatarObject.src)];
         }).catch((err) => {
            return [contact, avatar];
         });
      }

      return Promise.resolve([contact, avatar]);
   }

   private getAvatar(jid:JID) {
      let connection = this.pluginAPI.getConnection();

      return connection.loadVcard(jid).then(function(vcard) {
         return new Promise(function(resolve, reject){
            if (vcard.PHOTO && vcard.PHOTO.src) {
               resolve(vcard.PHOTO);
            } else {
               reject();
            }
         });
      });
   }
}
