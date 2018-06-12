import Storable from './StorableAbstract'
import Identifiable from './Identifiable.interface'
import Storage from './Storage'

const SEP = ':';

export default class ModelManager<Element extends Storable> {

   private id: string;

   private elementIds;

   constructor(private owner: Identifiable, private ElementClass: any, private storage: Storage) { //@REVIEW any -> Element?
      this.id = owner.getId() + SEP + ElementClass.constructor.name;

      this.elementIds = this.storage.getItem(this.id);
   }

   public get(id: string): Element {
      let data = this.storage.getItem(this.id + SEP + id);

      return new this.ElementClass(data);
   }

   public getAll(): Element[] {
      let elements: Element[] = [];

      for (let elementId in this.elementIds) {
         elements.push(this.get(elementId));
      }

      return elements;
   }

   public add(element: Element) {
      this.elementIds.push(element.getId());

      this.save();
   }

   public remove(element: Element) {
      this.elementIds = $.grep(this.elementIds, function(e) {
         return e !== element.getId();
      })

      this.save();
   }

   private save() {
      this.storage.setItem(this.id, this.elementIds);
   }
}
