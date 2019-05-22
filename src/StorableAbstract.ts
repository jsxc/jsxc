import IIdentifiable from './Identifiable.interface'

abstract class Storable implements IIdentifiable {
   constructor(data: any) {
      $.extend(this, data);
   }

   public abstract getId(): string;

   public abstract save();

   public abstract remove();
}

export default Storable;
