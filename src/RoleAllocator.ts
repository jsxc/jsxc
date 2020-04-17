import Storage from './Storage'
import Client from './Client'
import Log from './util/Log'

const MASTER_KEY = 'master';
const SLAVE_KEY = 'slave';

const MASTER_CLASS = 'jsxc-master';
const SLAVE_CLASS = 'jsxc-slave';

const CLAIM_PREFIX = 'claim';
const CLAIM_SEP = '|';

const TIMEOUT_QUERY = 600;
const TIMEOUT_CLAIM = 600;
const TIMEOUT_MIN_OBSERVATION = 2000;
const INTERVAL_KEEPALIVE = 1000;

enum Role { Master, Slave, Master_Pending, Unknown };

export default class RoleAllocator {
   private storage: Storage;

   private role: Role = Role.Unknown;

   private resolveTimeout;

   private observationTimeout;

   private keepAliveInterval: number;

   private claimTimeout;

   private masterResolves = [];

   private slaveResolves = [];

   private slaveValue;

   private masterValue;

   private claim: number;

   private static instance: RoleAllocator;

   private constructor() {
      this.storage = Client.getStorage();

      this.storage.registerHook(MASTER_KEY, this.onMaster);
      this.storage.registerHook(SLAVE_KEY, this.onSlave);
   }

   public static get(): RoleAllocator {
      if (!RoleAllocator.instance) {
         RoleAllocator.instance = new RoleAllocator();
      }

      return RoleAllocator.instance;
   }

   public isMaster() {
      return this.role === Role.Master;
   }

   public masterExists() {
      return this.role !== Role.Unknown;
   }

   public waitUntilMaster() {
      return new Promise((resolve) => {
         if (this.role === Role.Master) {
            resolve();
         } else if (typeof this.storage.getItem(MASTER_KEY) === 'undefined') {
            this.startMaster();

            resolve();
         } else {
            this.masterResolves.push(resolve);

            if (this.role !== Role.Slave) {
               this.queryMaster();
            }
         }
      });
   }

   public waitUntilSlave() {
      return new Promise((resolve) => {
         if (this.role === Role.Slave) {
            resolve();
         } else {
            this.slaveResolves.push(resolve);
         }
      });
   }

   private onMaster = (value) => {
      if (this.masterValue === value) {
         return;
      }

      if (this.role === Role.Master_Pending && value.indexOf(CLAIM_PREFIX) === 0) {
         this.thereIsAnotherPotentialMaster(value);

         return;
      }

      if (this.role === Role.Unknown || this.role === Role.Master_Pending) {
         this.thereIsAMaster();
      }

      if (this.role === Role.Slave) {
         this.masterIsStillAlive();
      } else if (this.role === Role.Master) {
         Log.error('Something went wrong. We have another master.');

         this.stopKeepAliveSignal();

         window.location.reload();
      }
   }

   private thereIsAnotherPotentialMaster(value) {
      Log.debug('There is another potential master');

      let foreignClaim = parseFloat(value.split(CLAIM_SEP)[1]);

      if (foreignClaim > this.claim) {
         clearTimeout(this.claimTimeout);

         this.role = Role.Unknown;
         this.claim = undefined;
      }
   }

   private thereIsAMaster() {
      Log.debug('I am slave');

      this.role = Role.Slave;
      clearTimeout(this.resolveTimeout);

      this.resolveAllSlave();

      $('body').addClass(SLAVE_CLASS).removeClass(MASTER_CLASS);
   }

   private onSlave = (value) => {
      if (this.slaveValue === value) {
         return;
      }

      if (this.role === Role.Master) {
         this.stillAlive();
      }
   }

   private queryMaster() {
      Log.debug('query master');

      this.resolveTimeout = setTimeout(() => {
         if (this.role === Role.Unknown) {
            this.claimMaster();
         }
      }, TIMEOUT_QUERY);

      this.storage.setItem(SLAVE_KEY, this.slaveValue = Math.random());
   }

   private claimMaster = () => {
      Log.debug('Claim master');

      this.claimTimeout = setTimeout(() => {
         if (this.role === Role.Master_Pending) {
            this.startMaster();
         }
      }, TIMEOUT_CLAIM);

      this.role = Role.Master_Pending;
      this.claim = Math.random();

      this.storage.setItem(MASTER_KEY, this.masterValue = `${CLAIM_PREFIX}${CLAIM_SEP}${this.claim}`);
   }

   private startMaster() {
      this.role = Role.Master;

      Log.debug('I am master')

      $('body').addClass(MASTER_CLASS).removeClass(SLAVE_CLASS);

      this.startKeepAliveSignal();

      this.resolveAllMaster();
   }

   private masterIsStillAlive() {
      clearTimeout(this.observationTimeout);

      let randomTime = Math.random() * 500;

      this.observationTimeout = setTimeout(this.masterProbablyDied, TIMEOUT_MIN_OBSERVATION + randomTime)
   }

   private masterProbablyDied = () => {
      this.role = Role.Unknown;
      this.queryMaster();
   }

   private startKeepAliveSignal() {
      this.stillAlive();

      this.keepAliveInterval = window.setInterval(this.stillAlive, INTERVAL_KEEPALIVE);
   }

   private stopKeepAliveSignal() {
      window.clearInterval(this.keepAliveInterval);
   }

   private resolveAllMaster() {
      this.resolveAll(this.masterResolves);
   }

   private resolveAllSlave() {
      this.resolveAll(this.slaveResolves);
   }

   private resolveAll(resolves) {
      for (let resolveIndex in resolves) {
         resolves[resolveIndex]();

         delete resolves[resolveIndex];
      }
   }

   private stillAlive = () => {
      this.storage.setItem(MASTER_KEY, this.masterValue = Math.random());
   }
}
