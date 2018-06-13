import * as StropheLib from 'strophe.js'

export let $iq: (attrs?: any) => Strophe.Builder = StropheLib.$iq;
export let $build: (name: string, attrs?: any) => Strophe.Builder = StropheLib.$build;
export let $msg: (attrs?: any) => Strophe.Builder = StropheLib.$msg;
export let $pres: (attrs?: any) => Strophe.Builder = StropheLib.$pres;
export let Strophe = StropheLib.Strophe;
export let NS = StropheLib.Strophe.NS;
