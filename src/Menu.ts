import IMenuItemFactory, { MenuItem } from './MenuItemFactory.interface';

export default class Menu<Params extends any[] = any[]> {
   constructor(private menuItems: IMenuItemFactory<Params>[] = []) {}

   public getMenuItems(...args: Params): MenuItem[] {
      return this.menuItems
         .map(menuItem => menuItem.generate(...args))
         .filter(menuItem => menuItem !== false) as MenuItem[];
   }

   public registerMenuItem(menuItem: IMenuItemFactory<Params>) {
      this.menuItems.push(menuItem);
   }

   public removeMenuItem(menuItem: IMenuItemFactory<Params>) {
      this.menuItems = this.menuItems.filter(item => item !== menuItem);
   }
}
