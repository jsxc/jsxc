
export default class JID {
   public readonly full:string;

   public readonly bare:string;

   public readonly node:string;

   public readonly domain:string;

   public readonly resource:string;

   constructor(full:string) {
      this.full = (full || '').toLowerCase();
      let matches = /(([^@]+)@([^/]+))(?:\/(.+))?/.exec(this.full);

      this.bare = matches[1];
      this.node = matches[2];
      this.domain = matches[3];
      this.resource = matches[4];
   }

   public toString() {
      return this.full;
   }

   public isBare() {
      return this.full === this.bare;
   }
}
