import PersistentMap from './util/PersistentMap'
import Client from './Client'
import Form from './connection/Form'
import { DiscoInfo } from './DiscoInfo.interface'
import * as sha1 from 'sha1'

interface Identity {
   category: string
   type: string,
   name?: string,
   lang?: string
}

export default class implements DiscoInfo {
   protected data: PersistentMap;

   public static exists(version: string) {
      let data = new PersistentMap(Client.getStorage(), 'disco', version);
      let identities = data.get('identities');

      return identities && identities.length;
   }

   /* @TODO support extended information formatted according to XEP-0128
    * consider this information also for generateCapsVersion
    */
   constructor(identities: Identity[], features: string[], forms: Form[])
   constructor(version: string)
   constructor() {
      let storage = Client.getStorage();
      let version;

      if (arguments.length === 1 && typeof arguments[0] === 'string') {
         version = arguments[0];
      } else {
         version = this.generateCapsVersion(arguments[0], arguments[1]);
      }

      this.data = new PersistentMap(storage, 'disco', version);

      if (arguments.length === 3) {
         this.data.set('identities', arguments[0]);
         this.data.set('features', arguments[1]);
         this.data.set('forms', arguments[2].map((form: Form) => form.toJSON()));
      }
   }

   public getIdentities() {
      return this.data.get('identities') || []
   }

   public getFeatures(): string[] {
      return this.data.get('features') || [];
   }

   public getForms(): Form[] {
      let serializedForms = this.data.get('forms') || []

      return serializedForms.map(form => Form.fromJSON(form));
   }

   public getFormByType(type: string): Form {
      let forms = this.getForms();
      let form = forms.filter((form) => {
         let formType = form.getValues('FORM_TYPE') || [];

         return formType.length === 1 && formType[0] === type;
      });

      return form.length === 1 ? form[0] : undefined;
   }

   public getCapsVersion(): String {
      //@REVIEW cache?
      return this.generateCapsVersion(this.getIdentities(), this.getFeatures());
   }

   public hasFeature(features: string[]): boolean
   public hasFeature(feature: string): boolean
   public hasFeature() {
      let features = (arguments[0] instanceof Array) ? arguments[0] : [arguments[0]];
      let availableFeatures = this.getFeatures();

      for (let feature of features) {
         if (availableFeatures.indexOf(feature) < 0) {
            return false;
         }
      }

      return true;
   }

   protected generateCapsVersion(identities: Identity[], features: string[]): string {
      let version = '';

      identities = identities.sort(this.sortIdentities);
      features = features.sort();

      for (let identity of identities) {
         version += identity.category + '/';
         version += identity.type + '/';
         version += identity.lang + '/';
         version += identity.name + '<';
      }

      for (let feature of features) {
         version += feature + '<';
      }

      return btoa(sha1(version, { asString: true }));
   }

   protected sortIdentities(a, b) {
      if (a.category > b.category) {
         return 1;
      }
      if (a.category < b.category) {
         return -1;
      }
      if (a.type > b.type) {
         return 1;
      }
      if (a.type < b.type) {
         return -1;
      }
      if (a.lang > b.lang) {
         return 1;
      }
      if (a.lang < b.lang) {
         return -1;
      }
      return 0;
   }
}
