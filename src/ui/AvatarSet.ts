import { IContact } from '../Contact.interface'
import Color from '../util/Color'
import Client from '@src/Client';
import { IJID } from '@src/JID.interface';

export default class AvatarSet {

   private elements: JQuery[] = [];

   private static avatars = {};

   public static get(contact: IContact): AvatarSet {
      let avatar = AvatarSet.avatars[contact.getUid()];

      if (!avatar) {
         avatar = AvatarSet.avatars[contact.getUid()] = new AvatarSet(contact);
      }

      return avatar;
   }

   public static setPlaceholder(elements: JQuery, text: string, jid?: IJID) {
      AvatarSet.placeholder(elements, text, jid);
   }

   public addElement(element) {
      this.elements.push(element);

      this.reload();
   }

   public reload() {
      this.showSpinner();

      this.contact.getAvatar().then((avatar) => {
         $(this.elements).each(function() {
            let element = $(this);

            element.css('background-image', `url(${avatar.getData()})`);
            element.text('');
         });
      }).catch((msg) => {
         AvatarSet.placeholder(this.elements, this.contact.getName(), this.contact.getJid());
      }).then(() => {
         this.hideSpinner();
      });
   }

   private constructor(private contact: IContact) {
      this.contact.registerHook('name', (name) => {
         this.reload();
      });
   }

   private static placeholder(elements: JQuery|JQuery[], text: string, jid: IJID) {
      let avatarPlaceholder = Client.getOption('avatarPlaceholder');

      let color = Color.generate(text);

      $(elements).each(function() {
         avatarPlaceholder($(this), text, color, jid);
      });
   }

   public static clear(elements) {
      $(elements).each(function() {
         let element = $(this);

         element.css({
            'background-image': '',
            'background-color': ''
         });

         element.text('');
      });
   }

   private showSpinner() {
      $(this.elements).each(function() {
         $(this).addClass('jsxc-avatar--loading');
      });
   }

   private hideSpinner() {
      $(this.elements).each(function() {
         $(this).removeClass('jsxc-avatar--loading');
      });
   }
}
