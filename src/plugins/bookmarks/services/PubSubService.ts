import AbstractService from './AbstractService';
import * as NS from '@connection/xmpp/namespace'
import RoomBookmark from '../RoomBookmark';
import { IJID } from '@src/JID.interface';
import { IConnection } from '@connection/Connection.interface';
import Form from '@connection/Form';
import JID from '@src/JID';
import Log from '@util/Log';
import { $build } from '@vendor/Strophe';

NS.register('BOOKMARKS', 'storage:bookmarks');

/**
 * XEP-0048: Bookmarks
 *
 * @version 1.1
 * @see https://xmpp.org/extensions/xep-0048.html
 */

export class PubSubService extends AbstractService {
   constructor(private connection: IConnection) {
      super();
   }

   public getName(): string {
      return 'pubsub';
   }

   public async getRooms(): Promise<RoomBookmark[]> {
      let storageElement: JQuery<Element>;
      try {
         storageElement = await this.getBookmarks();
      } catch (err) {
         Log.info(err);

         return [];
      }
      let bookmarkElements = storageElement.children().get();

      return bookmarkElements.filter(element => element.tagName.toLowerCase() === 'conference').map(element => this.parseConferenceElement(element));
   }

   public async addRoom(room: RoomBookmark) {
      this.addBookmark(room);
   }

   public async removeRoom(id: IJID) {
      this.removeBookmark(id);
   }

   private parseConferenceElement(element: Element): RoomBookmark {
      let jid = new JID(element.getAttribute('jid'));
      let alias = element.getAttribute('name');
      let nickElement = element.getElementsByTagName('nick');
      let nickname = nickElement.length === 1 ? nickElement[0].textContent : undefined;
      let passwordElement = element.getElementsByTagName('password');
      let password = passwordElement.length === 1 ? passwordElement[0].textContent : undefined;
      let autoJoin = element.getAttribute('autojoin') === 'true';

      return new RoomBookmark(jid, alias, nickname, autoJoin, password);
   }

   // private createBookmarksNode() {
   //    let pubSubService = this.connection.getPubSubService();
   //    let options = this.getOptionForm();

   //    return pubSubService.createNode(NS.get('BOOKMARKS'), options);
   // }

   private async getBookmarks(): Promise<JQuery<Element>> {
      let pubSubService = this.connection.getPubSubService();
      let bookmarkNode = await pubSubService.getAllItems(NS.get('BOOKMARKS'));

      let storageElement = $(bookmarkNode).find(NS.getFilter('BOOKMARKS', 'storage'));

      if (storageElement.length !== 1) {
         throw new Error('Could not retrieve bookmarks.');
      }

      return storageElement;
   }

   private async addBookmark(room: RoomBookmark) {
      let storageElement: JQuery<Element>;
      try {
         storageElement = await this.getBookmarks();
      } catch (err) {
         storageElement = $('<storage>').attr('xmlns', NS.get('BOOKMARKS'));
      }

      let roomBareJid = room.getJid().bare;
      storageElement.find(`[jid="${roomBareJid}"]`).remove();

      let conferenceElement = $('<conference>');
      conferenceElement.attr({
         name: room.getAlias(),
         autojoin: room.isAutoJoin(),
         jid: roomBareJid,
      });

      if (room.hasNickname()) {
         let nickElement = $('<nick>');
         nickElement.text(room.getNickname());
         nickElement.appendTo(conferenceElement);
      }

      if (room.hasPassword()) {
         let passwordElement = $('<password>');
         passwordElement.text(room.getPassword());
         passwordElement.appendTo(conferenceElement);
      }

      storageElement.append(conferenceElement);

      return this.publishBookmarks(storageElement);
   }

   private async removeBookmark(id: IJID) {
      let storageElement: JQuery<Element>;
      try {
         storageElement = await this.getBookmarks();
      } catch (err) {
         return;
      }

      let conferenceElement = storageElement.find(`[jid="${id.bare}"]`);

      if (conferenceElement.length === 0) {
         return;
      }

      conferenceElement.remove();

      return this.publishBookmarks(storageElement);
   }

   private publishBookmarks(storageElement: JQuery<Element>) {
      let pubSubService = this.connection.getPubSubService();
      let item = $build('item', {
         id: 'current'
      }).cnode(storageElement.get(0));

      return pubSubService.publish(NS.get('BOOKMARKS'), item, this.getOptionForm());
   }

   private getOptionForm(): Form {
      return Form.fromJSON({
         type: 'submit',
         fields: [{
            type: 'hidden',
            name: 'FORM_TYPE',
            values: [NS.get('PUBSUB_PUBLISH_OPTIONS')]
         }, {
            name: 'pubsub#persist_items',
            values: ['1']
         }, {
            name: 'pubsub#access_model',
            values: ['whitelist']
         }]
      });
   }
}
