import Identifiable from './IdentifiableInterface'

abstract class Storable implements Identifiable {
   constructor(data:any) {
      $.extend(this, data);
   }

   public abstract getId():string;

   public abstract save();

   public abstract remove();
}

export default Storable;
