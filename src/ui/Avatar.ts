import Options from '../Options'
import Hash from '../util/Hash'
import {ContactInterface} from '../ContactInterface'

export default class Avatar {

   private elements = [];

   private static avatars = {};

   public static get(contact:ContactInterface) {
      let avatar = Avatar.avatars[contact.getId()];

      if (!avatar) {
         avatar = Avatar.avatars[contact.getId()] = new Avatar(contact);
      }

      return avatar;
   }

   public addElement(element) {
      this.elements.push(element);

      this.placeholder(element, this.contact.getName());
   }

   public reload() {
      this.placeholder(this.elements, this.contact.getName());
   }

   private constructor(private contact:ContactInterface) {
      this.contact.registerHook('name', (name) => {
         this.reload();
      })
   }

   private placeholder(elements, text) {
      var options = Options.get('avatarPlaceholder') || {};
      var hash = Hash.String(text);

      var hue = Math.abs(hash) % 360;
      var saturation = options.saturation || 90;
      var lightness = options.lightness || 65;

      $(elements).each(function(){
         let element = $(this);

         element.css({
            'background-color': 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)',
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
