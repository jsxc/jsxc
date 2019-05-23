import * as StropheLib from 'strophe.js'

export let $iq: (attrs?: any) => Strophe.Builder = StropheLib.$iq;
export let $build: (name: string, attrs?: any) => Strophe.Builder = StropheLib.$build;
export let $msg: (attrs?: any) => Strophe.Builder = StropheLib.$msg;
export let $pres: (attrs?: any) => Strophe.Builder = StropheLib.$pres;
export let Strophe = StropheLib.Strophe;
export let NS = StropheLib.Strophe.NS;
export let Status: IStatus = StropheLib.Strophe.Status;

interface IStatus {
   ATTACHED: number
   AUTHENTICATING: number
   AUTHFAIL: number
   CONNECTED: number
   CONNECTING: number
   CONNFAIL: number
   CONNTIMEOUT: number
   DISCONNECTED: number
   DISCONNECTING: number
   ERROR: number
   REDIRECT: number
}

(<any> window).Strophe = Strophe;
(<any> window).$iq = $iq;
