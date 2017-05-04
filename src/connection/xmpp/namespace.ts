import Log from '../../util/Log'

export function register(name:string, value:string):void {
   Strophe.addNamespace(name, value);
}

export function get(name:string) {
   let value = Strophe.NS[name];

   if (!value) {
      Log.debug('Can not resolve requested namespace ' + name);
   }

   return value;
}

export function getFilter(name:string) {
   return '[xmlns="' + get(name) + '"]';
}
