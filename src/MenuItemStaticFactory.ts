import IMenuItemFactory, { MenuItem } from './MenuItemFactory.interface';

export default class MenuItemStaticFactory<Params extends any[] = any[]> implements IMenuItemFactory<Params> {
   constructor(
      private id: string,
      private label: string,
      private handler: (...args: Params) => void,
      private icon?: string
   ) {}

   public generate(...args: Params): MenuItem {
      return {
         id: this.id,
         label: this.label,
         handler: () => this.handler(...args),
         icon: this.icon,
      };
   }
}
