
export interface IJID {
   readonly full: string;

   readonly bare: string;

   readonly node: string;

   readonly domain: string;

   readonly resource: string;

   toString(): string;

   toEscapedString(): string;

   isBare(): boolean;

   isServer(): boolean;
}
