import Options from '../Options'
import Hash from '../util/Hash'
import {ContactInterface} from '../ContactInterface'

export default class AvatarSet {

   private elements = [];

   private static avatars = {};

   public static get(contact:ContactInterface) {
      let avatar = AvatarSet.avatars[contact.getId()];

      if (!avatar) {
         avatar = AvatarSet.avatars[contact.getId()] = new AvatarSet(contact);
      }

      return avatar;
   }

   public static setPlaceholder(elements, text:string) {
      AvatarSet.placeholder(elements, text);
   }

   public addElement(element) {
      this.elements.push(element);

      this.reload();
   }

   public reload() {
      //@TODO spinner?
      this.contact.getAvatar().then((avatar) => {
         $(this.elements).each(function(){
            let element = $(this);

            element.css('background-image', `url(${avatar.getData()})`);
            element.text('');
         });
      }).catch((msg) => {
         AvatarSet.placeholder(this.elements, this.contact.getName());
      });
   }

   private constructor(private contact:ContactInterface) {
      this.contact.registerHook('name', (name) => {
         this.reload();
      });
   }

   private static placeholder(elements, text:string) {
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
