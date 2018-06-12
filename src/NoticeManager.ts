import Storage from './Storage'
import SortedPersistentMap from './util/SortedPersistentMap'
import Roster from './ui/Roster'
import { NoticeData, Notice } from './Notice'

export class NoticeManager {
   private notices;

   constructor(private storage: Storage) {
      this.notices = new SortedPersistentMap(this.storage, 'notices');

      this.notices.setRemoveHook((id) => {
         Roster.get().removeNotice(this, id);
      });

      this.notices.setPushHook((id) => {
         let notice = new Notice(this.storage, id);

         Roster.get().addNotice(this, notice);

         return notice;
      });

      this.notices.init();
   }

   public getId(): string {
      return this.storage.getName();
   }

   public addNotice(noticeData: NoticeData) {
      let notice = new Notice(this.storage, noticeData);

      if (this.notices.get(notice.getId())) {
         return;
      }

      this.notices.push(notice);
   }

   public removeNotice(notice: Notice) {
      this.notices.remove(notice);
   }

   public removeAll() {
      this.notices.empty((id) => {
         Roster.get().removeNotice(this, id);
      });
   }
}
