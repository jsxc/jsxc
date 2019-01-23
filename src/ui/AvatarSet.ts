import Client from '../Client'
import { IContact } from '../Contact.interface'
import Color from '../util/Color'

export default class AvatarSet {

   private elements = [];

   private static avatars = {};

   public static get(contact: IContact): AvatarSet {
      let avatar = AvatarSet.avatars[contact.getUid()];

      if (!avatar) {
         avatar = AvatarSet.avatars[contact.getUid()] = new AvatarSet(contact);
      }

      return avatar;
   }

   public static setPlaceholder(elements, text: string) {
      AvatarSet.placeholder(elements, text);
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
         AvatarSet.placeholder(this.elements, this.contact.getName());
      }).then(() => {
         this.hideSpinner();
      });
   }

   private constructor(private contact: IContact) {
      this.contact.registerHook('name', (name) => {
         this.reload();
      });
   }

   private static placeholder(elements, text: string) {
      // let options = Client.getOption('avatarPlaceholder') || {};

      let color = Color.generate(text);

      $(elements).each(function() {
         let element = $(this);

         element.css({
            'background-color': color,
            'color': '#fff',
            'font-weight': 'bold',
            'text-align': 'center',
            'line-height': '36px', // element.height() + 'px',
            'font-size': '22px', //element.height() * 0.6 + 'px'
         });

         element.text(text[0].toUpperCase());
      });
   }

   public static clear(elements) {
      $(elements).each(function() {
         let element = $(this);

         element.css({
            'background-image': 'url()',
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
