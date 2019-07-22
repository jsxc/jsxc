import Contact from '../../Contact'

const CLASS_DISABLED = 'jsxc-disabled';

export default class ElementHandler {
   constructor(private contact: Contact) {

   }

   public add(element: Element, handler: (ev: Event) => void, requiredFeatures?: string[]) {
      if (requiredFeatures && requiredFeatures.length > 0) {
         this.contact.registerCapableResourcesHook(requiredFeatures, (resources) => {
            this.updateStatus(element, resources);
         });
      }

      $(element).on('click', function() {
         if (!element.classList.contains(CLASS_DISABLED)) {
            handler.apply(this, arguments);
         }
      })
   }

   private updateStatus(element, resources) {
      if (resources && resources.length > 0) {
         element.classList.remove(CLASS_DISABLED);
      } else {
         element.classList.add(CLASS_DISABLED);
      }
   }
}
