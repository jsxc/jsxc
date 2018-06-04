interface ISignalProtocolAddress {
   constructor(name, deviceId)
   getName: () => string
   getDeviceId: () => number
   toString: () => string
   equals: (ISignalProtocolAddress) => boolean
}

let libsignal = (<any>window).libsignal || {};

export let KeyHelper = libsignal.KeyHelper;
export let SignalProtocolAddress = libsignal.SignalProtocolAddress;
export let SessionBuilder = libsignal.SessionBuilder;
export let SessionCipher = libsignal.SessionCipher;
export let FingerprintGenerator = libsignal.FingerprintGenerator;
