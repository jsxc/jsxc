import HookRepository from '@util/HookRepository';

export interface IMenuItem {
   label: string
   handler: () => void
   icon?: string
   classNames?: string[] | string
}

type Handler = (menuItems: IMenuItem[]) => void;

export default class Menu {
   private hookRepository: HookRepository<Handler>;

   constructor(private menuItems: IMenuItem[] = []) {
      this.hookRepository = new HookRepository();
   }

   public getMenuItems(): IMenuItem[] {
      return this.menuItems;
   }

   public pushMenuItem(menuItem: IMenuItem) {
      this.menuItems.push(menuItem);

      this.hookRepository.trigger('changed', [this.menuItems]);
   }

   public registerMenuItemHandler(handler: Handler){
      this.hookRepository.registerHook('changed', handler);

      handler(this.menuItems);
   }
}
