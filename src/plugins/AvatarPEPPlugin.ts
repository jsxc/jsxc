import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Contact from '../Contact'
import Avatar from '../Avatar'
import AvatarUI from '../ui/AvatarSet'
import JID from '../JID'
import Log from '../util/Log';
import { ContactType } from '@src/Contact.interface';
import Translation from '@util/Translation';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

class ImageData
{
    data : string;
    type : string;
    hash : string;

    constructor(cdata: string, ctype: string, chash: string)
    {
        this.data=cdata;
        this.type=ctype;
        this.hash=chash;
    }

    public getData()
    {
        return this.data;
    }

    public getType()
    {
        return this.type;
    }

    public getHash()
    {
        return this.hash;
    }
}

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
         xeps: [{
            id: 'XEP-0084',
            name: 'PEP-Based Avatars',
            version: '1.0',
         }]
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onMessageAvatarUpdate, 'http://jabber.org/protocol/pubsub#event', 'message');

      pluginAPI.addAvatarProcessor(this.avatarProcessor, 49);
   }

   private getStorage() {
      return this.pluginAPI.getStorage();
   }

   private onMessageAvatarUpdate = (stanza) => {
      let from = new JID($(stanza).attr('from'));
      let metadata = $(stanza).find('metadata[xmlns="urn:xmpp:avatar:metadata"]');
      let data = $(stanza).find('data[xmlns="urn:xmpp:avatar:data"]');

      if (metadata.length > 0) {
         let info = metadata.find('info');

         if (info.length > 0) {
            let contact = this.pluginAPI.getContact(from);

            if (contact && contact.getType() === ContactType.GROUPCHAT && from.resource) {
               return true;
            }

            let sha1OfAvatar = $(info).attr('id');

            this.getStorage().setItem(from.bare, sha1OfAvatar);

            if (!contact) {
               this.pluginAPI.Log.warn('No contact found for', from);
               return true;
            }

            let avatarUI = AvatarUI.get(contact);
            avatarUI.reload();
         }

      }
      else
      if (data.length > 0) {
           let contact = this.pluginAPI.getContact(from);
           if (contact && contact.getType() === ContactType.GROUPCHAT && from.resource) {
               return true;
           }
           let item = $($(stanza).find('items[node="urn:xmpp:avatar:data"]')).find('item[id]')[0];
           let hash = $(item).attr('id');
           this.getStorage().setItem(from.bare, hash);
           let avatarUI = AvatarUI.get(contact);
           avatarUI.reload();
      }

      return true;
   }

   private avatarProcessor = (contact: Contact, avatar: Avatar): Promise<any> => {
      let storage = this.getStorage();
      let hash = storage.getItem(contact.getJid().bare);

      if (!hash || avatar) {
            return this.getAvatar(contact.getJid()).then((imgdata: ImageData) => {

            return [contact, new Avatar(imgdata.getHash(), imgdata.getType(), imgdata.getData())];
         }).catch((err) => {
            return Promise.resolve([contact, avatar]);
         });
      }

      try {
         avatar = new Avatar(hash);
      } catch (err) {
         return this.getAvatar(contact.getJid()).then((imgdata: ImageData) => {

            return [contact, new Avatar(imgdata.getHash(), imgdata.getType(), imgdata.getData())];
         }).catch((err) => {
            Log.warn('Error during avatar retrieval', err)
            console.log('Error during avatar retrieval');
            return [contact, avatar];
         });
      }

      return Promise.resolve([contact, avatar]);
   }

   private getAvatar(jid: JID) {
      let connection = this.pluginAPI.getConnection();

      return connection.getPEPService().retrieveItems('urn:xmpp:avatar:metadata',jid.bare).then(function(meta) {

            let metadata = $(meta).find('metadata[xmlns="urn:xmpp:avatar:metadata"]');

            if (metadata.length > 0)
            {
                 let info = metadata.find('info');

                 if (info.length > 0)
                 {
                    let hash = $(info).attr('id');

                    return connection.getPEPService().retrieveItems('urn:xmpp:avatar:data',jid.bare).then(function(data) {
                         return new Promise(function(resolve, reject) {
                            if (data&&$(data).text()&&$(data).text().trim().length>0) {
                               let src = $(data).text().replace(/[\t\r\n\f]/gi, '');
                               let type = $(info).attr('type').replace(/[\t\r\n\f]/gi, '');
                               let uristring = 'data:' + type + ';base64,' + src;
                               let imgdata = new ImageData(uristring,type,hash);

                               resolve(imgdata);
                            } else {
                               reject();
                            }
                         });
                    });
                 }
            }

            return new Promise(function(resolve, reject) {
                 reject();
            });
      });
   }
}
