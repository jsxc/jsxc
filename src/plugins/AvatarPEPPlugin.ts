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
import ImageHelper from '@util/ImageHelper';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const UANS_BASE = 'urn:xmpp:avatar';
const UANS_METADATA = UANS_BASE + ':metadata';
const UANS_DATA = UANS_BASE + ':data';

type AvatarMetaData = {
   bytes?: number;
   id: string;
   type?: string;
   height?: number;
   width?: number;
   url?: string;
};

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

      connection.getPEPService().subscribe(UANS_BASE, this.onMessageAvatarUpdate);

      pluginAPI.addAvatarProcessor(this.avatarProcessor, 49);
      pluginAPI.addPublishAvatarProcessor(this.publishAvatarProcessor, 49);
   }

   public getStorage() {
      return this.pluginAPI.getStorage();
   }

   private publishAvatarProcessor = async (avatar: IAvatar | null): Promise<[IAvatar]> => {
      let pepService = this.pluginAPI.getConnection().getPEPService();

      if (!avatar || !avatar.getData()) {
         let item = $build('metadata', { xmlns: UANS_METADATA });

         await pepService.publish(UANS_METADATA, item.tree(), UANS_METADATA);

         return [avatar];
      }

      const avatarData = avatar.getData();
      const imageDataUrl = avatar.getType() !== 'image/png' ? await ImageHelper.convertToPNG(avatarData) : avatarData;
      const imageData = imageDataUrl.replace(/^.+;base64,/, '');
      const imageId = Hash.SHA1FromBase64(imageDataUrl);

      let dataElement = $build('data', { xmlns: UANS_DATA }).t(imageData).tree();

      await pepService.publish(UANS_DATA, dataElement, imageId);

      let imageSize = FileHelper.getFileSizeFromBase64(imageDataUrl);

      let metadataElement = $build('metadata', {
         xmlns: UANS_METADATA,
      })
         .c('info', {
            bytes: imageSize,
            id: imageId,
            type: 'image/png',
         })
         .tree();

      await pepService.publish(UANS_METADATA, metadataElement, imageId);

      return [avatar];
   };

   private onMessageAvatarUpdate = stanza => {
      let from = new JID($(stanza).attr('from'));
      let metadata = $(stanza).find(`metadata[xmlns="${UANS_METADATA}"]`);

      if (metadata.length === 0) {
         return true;
      }

      const contact = this.pluginAPI.getContact(from);

      if (!contact) {
         this.pluginAPI.Log.warn(`Ignore PEP avatar notification for ${from.full}, because we do not know him.`);
         return true;
      }

      const info = metadata.find('>info[type="image/png"]');
      const avatarUI = AvatarUI.get(contact);
      const meta: AvatarMetaData =
         info.length > 0
            ? {
                 id: info.attr('id'),
                 type: info.attr('type'),
                 bytes: info.attr('bytes') ? parseInt(info.attr('bytes'), 10) : undefined,
                 width: info.attr('width') ? parseInt(info.attr('width'), 10) : undefined,
                 height: info.attr('height') ? parseInt(info.attr('height'), 10) : undefined,
              }
            : {
                 id: '',
              };
      const cachedMeta = this.getStorage().getItem<AvatarMetaData>(from.bare);

      if (!cachedMeta || meta.id !== cachedMeta.id) {
         this.getStorage().setItem<AvatarMetaData>(contact.getJid().bare, meta);

         avatarUI.reload();
      }

      return true;
   };

   private avatarProcessor = async (contact: IContact, avatar: IAvatar): Promise<[IContact, IAvatar]> => {
      let storage = this.getStorage();
      let meta = storage.getItem<AvatarMetaData>(contact.getJid().bare);

      if (!meta || !meta.id) {
         return [contact, avatar];
      }

      try {
         avatar = new Avatar(meta.id);
      } catch (err) {
         try {
            const avatarObject = await this.getAvatar(contact);
            avatar = new Avatar(meta.id, avatarObject.type, avatarObject.src);
         } catch (err) {
            this.pluginAPI.Log.warn('Error during pep avatar retrieval', err);

            return [contact, avatar];
         }
      }

      return [contact, avatar];
   };

   private async getAvatar(contact: IContact): Promise<{ src: string; type: string }> {
      const connection = this.pluginAPI.getConnection();
      const cachedMetaData = this.getStorage().getItem<AvatarMetaData>(contact.getJid().bare);

      if (!cachedMetaData) {
         throw new Error('No avatar meta data is cached');
      }

      if (!cachedMetaData.id) {
         throw new Error('User has no avatar');
      }

      const stanza = await connection
         .getPEPService()
         .retrieveItems(UANS_DATA, contact.getJid().bare, cachedMetaData.id);
      const dataStanza = $(stanza).find(`data[xmlns="${UANS_DATA}"]`);

      if (dataStanza.length !== 1) {
         throw new Error('Could not retrieve avatar pep item');
      }

      const data = dataStanza.text().replace(/[\t\r\n\f]/gim, '');

      try {
         window.atob(data);
      } catch (_) {
         throw new Error('Received invalid base64 encoded string');
      }

      const src = 'data:' + cachedMetaData.type + ';base64,' + data;
      const imageId = Hash.SHA1FromBase64(src);

      if (cachedMetaData.id !== imageId) {
         this.pluginAPI.Log.info(
            `Cached image id (${cachedMetaData.id}) is different to the retrieved image (${imageId}).`
         );
      }

      return {
         src,
         type: cachedMetaData.type,
      };
   }
}
