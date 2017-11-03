
export interface JIDInterface {
   readonly full: string;

   readonly bare: string;

   readonly node: string;

   readonly domain: string;

   readonly resource: string;

   toString(): string;

   isBare(): boolean;
}
