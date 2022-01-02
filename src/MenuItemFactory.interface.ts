export type MenuItem = {
   id: string;
   label: string;
   icon?: string;
   disabled?: boolean;
   handler: (ev: Event) => void;
};

export default interface IMenuItemFactory<Params extends any[]> {
   generate: (...args: Params) => MenuItem | false;
}
