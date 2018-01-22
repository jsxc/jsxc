import Options from '../Options'
import Hash from '../util/Hash'
import { ContactInterface } from '../ContactInterface'
import * as getRGB from 'consistent-color-generation'

export default class AvatarSet {

   private elements = [];

   private static avatars = {};

   public static get(contact: ContactInterface) {
      let avatar = AvatarSet.avatars[contact.getId()];

      if (!avatar) {
         avatar = AvatarSet.avatars[contact.getId()] = new AvatarSet(contact);
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
      //@TODO spinner?
      this.contact.getAvatar().then((avatar) => {
         $(this.elements).each(function() {
            let element = $(this);

            element.css('background-image', `url(${avatar.getData()})`);
            element.text('');
         });
      }).catch((msg) => {
         AvatarSet.placeholder(this.elements, this.contact.getName());
      });
   }

   private constructor(private contact: ContactInterface) {
      this.contact.registerHook('name', (name) => {
         this.reload();
      });
   }

   private static placeholder(elements, text: string) {
      let options = Options.get('avatarPlaceholder') || {};
      let hash = Hash.String(text);

      let hue = Math.abs(hash) % 360;
      let saturation = options.saturation || 90;
      let lightness = options.lightness || 65;
      let hsl = 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';

      let color = getRGB(text);
      let r = Math.round(color.r * 255);
      let g = Math.round(color.g * 255);
      let b = Math.round(color.b * 255);
      let rgb = `rgb(${r}, ${g}, ${b})`;

      $(elements).each(function() {
         let element = $(this);

         element.css({
            'background-color': rgb,
            'color': '#fff',
            'font-weight': 'bold',
            'text-align': 'center',
            'line-height': '36px', // element.height() + 'px',
            'font-size': '22px', //element.height() * 0.6 + 'px'
         });

         element.text(text[0].toUpperCase());
      });
   }
}
