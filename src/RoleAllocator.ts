import Storage from './Storage'
import Client from './Client'
import Log from './util/Log'

export default class RoleAllocator {
   private storage: Storage;

   private master: boolean = null;

   private keepAliveInterval;

   private resolveTimeout;

   private observationTimeout;

   private resolves = [];

   // private reject;

   private slaveValue;

   private masterValue;

   private static instance;

   private constructor() {
      this.storage = Client.getStorage();

      this.storage.registerHook('master', (value) => {
         if (this.masterValue === value) {
            return;
         }

         if (this.master === null) {
            Log.debug('i am slave');

            this.master = false;
            clearTimeout(this.resolveTimeout);

            $('body').addClass('jsxc-slave').removeClass('jsxc-master');
            // if (typeof this.reject === 'function') {
            //    //this.reject();
            //    this.reject = null;
            // }
         }

         if (this.master !== true) {
            this.masterIsStillAlive();
         } else {
            Log.error('Something went wrong. We have another master.');
         }
      });

      this.storage.registerHook('slave', (value) => {
         if (this.slaveValue === value) {
            return;
         }

         if (this.master === true) {
            this.stillAlive();
         }
      });
   }

   public static get() {
      if (!RoleAllocator.instance) {
         RoleAllocator.instance = new RoleAllocator();
      }

      return RoleAllocator.instance;
   }

   public isMaster() {
      return this.master;
   }

   public waitUntilMaster() {
      return new Promise((resolve) => {
         if (this.master === true || typeof this.storage.getItem('master') === 'undefined') {
            resolve();
         } else {
            this.resolves.push(resolve);

            if (this.master !== false) {
               this.queryMaster();
            }
         }
      });
   }

   private queryMaster() {
      Log.debug('query master');

      let self = this;

      this.resolveTimeout = setTimeout(() => {
         this.master = true;

         Log.debug('no one responded, i am master')

         $('body').addClass('jsxc-master').removeClass('jsxc-slave');

         this.startKeepAliveSignal();

         this.resolveAll();
      }, 1000);

      this.storage.setItem('slave', this.slaveValue = Math.random());
   }

   private masterIsStillAlive() {
      clearTimeout(this.observationTimeout);

      let randomTime = (Math.random() * 1000) % 500;

      this.observationTimeout = setTimeout(this.masterProbablyDied, 2000 + randomTime)
   }

   private masterProbablyDied = () => {
      this.master = null;
      this.queryMaster();
   }

   private startKeepAliveSignal() {
      this.stillAlive();

      this.keepAliveInterval = window.setInterval(this.stillAlive, 1000);
   }

   private stopKeepAliveSignal() {
      window.clearInterval(this.keepAliveInterval);
   }

   private resolveAll() {
      for (let resolveIndex in this.resolves) {
         this.resolves[resolveIndex]();

         delete this.resolves[resolveIndex];
      }
   }

   private stillAlive = () => {
      this.storage.setItem('master', this.masterValue = Math.random());
   }
}
