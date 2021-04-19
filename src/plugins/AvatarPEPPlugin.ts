import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import { IContact } from '../Contact.interface';
import Avatar from '../Avatar';
import JID from '../JID';
import Translation from '@util/Translation';
import Hash from '@util/Hash';
import { IAvatar } from '@src/Avatar.interface';
import AvatarUI from '../ui/AvatarSet';
import FileHelper from '@util/FileHelper';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const UANS_BASE = 'urn:xmpp:avatar';
const UANS_METADATA = +UANS_BASE + ':metadata';
const UANS_NOTIFY = UANS_METADATA + '+notify';
const UANS_DATA = UANS_BASE + ':data';

export default class AvatarPEPPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'pep-avatars';
   }

   public static getName(): string {
      return 'PEP-based Avatars';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-pep-avatar-enable'),
         xeps: [
            {
               id: 'XEP-0084',
               name: 'User Avatar',
               version: '1.1.4',
            },
         ],
      };
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onMessageAvatarUpdate, 'http://jabber.org/protocol/pubsub#event', 'message');

      pluginAPI.addAvatarProcessor(this.avatarProcessor, 49);
      pluginAPI.addPublishAvatarProcessor(this.publishAvatarProcessor, 49);
      pluginAPI.addFeature(UANS_NOTIFY);
   }

   public getStorage() {
      return this.pluginAPI.getStorage();
   }

   private publishAvatarProcessor = (avatar: IAvatar | null): Promise<[IAvatar]> => {
      let connection = this.pluginAPI.getConnection();

      if (!avatar || avatar.getData() === undefined) {
         let item = $build('metadata', { xmlns: UANS_METADATA });

         return connection
            .getPEPService()
            .publish(UANS_METADATA, item.tree(), UANS_METADATA)
            .then(function (result) {
                return [undefined];
            });
      } else {
         let data = $build('data', { xmlns: UANS_DATA }).t(avatar.getData()).tree();

         return connection
            .getPEPService()
            .publish(UANS_DATA, data, UANS_DATA)
            .then((result: any) => {

                let hash = Hash.SHA1FromBase64(avatar.getData());
                let i = new Image();
                let size = FileHelper.getFileSizeFromBase64(avatar.getData());
                i.src = 'data:' + avatar.getType() + ';base64,' + avatar.getData();
                let metadata = $build('metadata', { xmlns: UANS_METADATA })
                    .c('info', { bytes: size, id: hash, type: avatar.getType() })
                    .tree();

                return connection
                    .getPEPService()
                    .publish(UANS_METADATA, metadata, UANS_METADATA)
                    .then(function (result) {
                        if ($(result).attr('type') === 'result') {
                            return [undefined];
                        } else {
                            return [avatar];
                        }
                     });
            });
      }
   };

   private onMessageAvatarUpdate = stanza => {
      let from = new JID($(stanza).attr('from'));
      let metadata = $(stanza).find('metadata[xmlns="urn:xmpp:avatar:metadata"]');
      let data = $(stanza).find('data[xmlns="urn:xmpp:avatar:data"]');

      if (metadata.length > 0) {
         let info = metadata.find('info');
         let contact = this.pluginAPI.getContact(from);
         if (!contact) {
            this.pluginAPI.Log.warn('No contact found for', from);
            return true;
         }

         if (info.length > 0) {
            let hash = info.attr('id');

            let storedHash = this.getStorage().getItem(from.bare);
            if (storedHash === undefined || hash !== storedHash) {
               let avatarUI = AvatarUI.get(contact);
               this.getStorage().setItem(contact.getJid().bare, hash);
               avatarUI.reload();
            }
         } else {
            let avatarUI = AvatarUI.get(contact);
            this.getStorage().setItem(contact.getJid().bare, '');
            avatarUI.reload();
         }
      } else if (data.length > 0) {
         let contact = this.pluginAPI.getContact(from);
         if (!contact) {
            this.pluginAPI.Log.warn('No contact found for', from);
            return true;
         }

         let src = data.text().replace(/[\t\r\n\f]/gi, '');
         const b64str = src.replace(/^.+;base64,/, '');
         let hash = Hash.SHA1FromBase64(b64str);
         let avatarUI = AvatarUI.get(contact);
         this.getStorage().setItem(contact.getJid().bare, hash);
         avatarUI.reload();
      }

      return true;
   };

   private avatarProcessor = async (contact: IContact, avatar: IAvatar): Promise<[IContact, IAvatar]> => {
      let storage = this.getStorage();
      let hash = storage.getItem(contact.getJid().bare);

      if (!hash && !avatar) {
         try {
            const avatarObject = await this.getAvatar(contact);
            const data = avatarObject.src.replace(/^.+;base64,/, '');
            avatar = new Avatar(Hash.SHA1FromBase64(data), avatarObject.type, avatarObject.src);

            this.getStorage().setItem(contact.getJid().bare, avatar.getHash() || '');

            let avatarUI = AvatarUI.get(contact);
            avatarUI.reload();
         } catch (err) {
            // we could not find any avatar
         }
      }

      if (!hash || avatar) {
         return [contact, avatar];
      }

      try {
         avatar = new Avatar(hash);
      } catch (err) {
         try {
            const avatarObject = await this.getAvatar(contact);
            avatar = new Avatar(hash, avatarObject.type, avatarObject.src);
         } catch (err) {
            this.pluginAPI.Log.warn('Error during avatar retrieval', err);
            return [contact, avatar];
         }
      }

      return [contact, avatar];
   };

   private async getAvatar(contact: IContact): Promise<{ src: string; type: string }> {
      let connection = this.pluginAPI.getConnection();

      return connection
         .getPEPService()
         .retrieveItems(UANS_METADATA, contact.getJid().bare)
         .then(meta => {
            let metadata = $(meta).find('metadata[xmlns="urn:xmpp:avatar:metadata"]');

            if (metadata.length > 0) {
               let info = metadata.find('info');

               if (info && info.length === 1) {
                  let hash = $(info).attr('id');
                  if (hash && hash.length > 0) {
                     let typeval = info.attr('type');
                     
                     let regextypeval = new RegExp(/image\/(\*|png|jpg|jpeg)/igm);
                     if (!regextypeval.test(typeval))
                     {
                        throw new Error('Mimetype not allowed');
                     }

                     return connection
                        .getPEPService()
                        .retrieveItems(UANS_DATA, contact.getJid().bare)
                        .then(data => {
                           if (data && $(data).text() && $(data).text().trim().length > 0) {
                              let src= $(data)
                                 .text()
                                 .replace(/[\t\r\n\f]/gim, '');
                              const b64str = src.replace(/^.+;base64,/, '');

                              if (b64str[0]!=='/' && //base64 mimeType for jpeg
                                  b64str[0]!=='i') //base64 mimeType for png
                              {
                                 throw new Error('Only jpeg and png files are supported.');
                              }

                              let regextypeval = new RegExp(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/igm);
                              if (!regextypeval.test(b64str))
                              {
                                 throw new Error('Data Source is not a valid base64 string!');
                              }

                              this.getStorage().setItem(contact.getJid().bare, Hash.SHA1FromBase64(b64str));
                              return { src: 'data:' + typeval + ';base64,' + src, type: typeval };
                           } else {
                              throw new Error('No photo available');
                           }
                        });
                  }
               }
            }

            throw new Error('No photo available');
         });
   }
}
