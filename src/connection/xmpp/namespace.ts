import Log from '../../util/Log'

let namespaces = {};

export function register(name: string, value: string): void {
   namespaces[name] = value;
}

export function get(name: string) {
   let value = Strophe.NS[name] || namespaces[name];

   if (!value) {
      Log.warn('Can not resolve requested namespace ' + name);
   }

   return value;
}

export function getFilter(name: string) {
   return '[xmlns="' + get(name) + '"]';
}
