import {JIDInterface} from './JIDInterface'

export default class JID implements JIDInterface {
   public readonly full:string;

   public readonly bare:string;

   public readonly node:string;

   public readonly domain:string;

   public readonly resource:string;

   constructor(full:string) {
      let matches = /([^@]+)@([^/]+)(?:\/(.+))?/.exec(full);

      this.node = this.unescapeNode(matches[1].toLowerCase());
      this.domain = matches[2].toLowerCase();
      this.resource = matches[3];

      this.bare = this.node + '@' + this.domain;
      this.full = this.bare + ((this.resource) ? '/' + this.resource : '');
   }

   public toString():string {
      return this.full;
   }

   public toEscapedString():string {
      let bare = this.escapeNode(this.node) + '@' + this.domain;

      return bare + ((this.resource) ? '/' + this.resource : '');
   }

   public isBare():boolean {
      return this.full === this.bare;
   }

   private escapeNode(node:string) {
      return node.replace(/^\s+|\s+$/g, '')
          .replace(/\\/g,  "\\5c")
          .replace(/ /g,   "\\20")
          .replace(/\"/g,  "\\22")
          .replace(/\&/g,  "\\26")
          .replace(/\'/g,  "\\27")
          .replace(/\//g,  "\\2f")
          .replace(/:/g,   "\\3a")
          .replace(/</g,   "\\3c")
          .replace(/>/g,   "\\3e")
          .replace(/@/g,   "\\40");
   }

   private unescapeNode(node:string) {
      return node.replace(/\\20/g, " ")
          .replace(/\\22/g, '"')
          .replace(/\\26/g, "&")
          .replace(/\\27/g, "'")
          .replace(/\\2f/g, "/")
          .replace(/\\3a/g, ":")
          .replace(/\\3c/g, "<")
          .replace(/\\3e/g, ">")
          .replace(/\\40/g, "@")
          .replace(/\\5c/g, "\\");
   }
}
