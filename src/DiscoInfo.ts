import PersistentMap from './util/PersistentMap'
import Client from './Client'
import Form from './connection/Form'
import { IDiscoInfo, IIdentity } from './DiscoInfo.interface'
import * as sha1 from 'sha1'
import FormField from '@connection/FormField';

export default class implements IDiscoInfo {
   protected data: PersistentMap;

   public static exists(version: string) {
      let data = new PersistentMap(Client.getStorage(), 'disco', version);
      let identities = data.get('identities');

      return identities && identities.length;
   }

   protected version: string;

   constructor(identities: IIdentity[], features: string[], forms: Form[])
   constructor(version: string)
   constructor() {
      let storage = Client.getStorage();

      if (arguments.length === 1 && typeof arguments[0] === 'string') {
         this.version = arguments[0];
      } else {
         this.version = this.generateCapsVersion(arguments[0], arguments[1], arguments[2]);
      }

      this.data = new PersistentMap(storage, 'disco', this.version);

      if (arguments.length === 3) {
         this.data.set('identities', arguments[0]);
         this.data.set('features', arguments[1]);
         this.data.set('forms', arguments[2].map((form: Form) => form.toJSON()));
      }
   }

   public getIdentities(): IIdentity[] {
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
      return this.version;
   }

   public hasFeature(features: string[] | string) {
      features = (arguments[0] instanceof Array) ? arguments[0] : [arguments[0]];
      let availableFeatures = this.getFeatures();

      for (let feature of features) {
         if (availableFeatures.indexOf(feature) < 0) {
            return false;
         }
      }

      return true;
   }

   protected generateCapsVersion(identities: IIdentity[], features: string[], forms: Form[]): string {
      let version = '';

      identities = identities.sort(this.sortIdentities);
      features = features.sort();
      forms = forms.sort(this.sortForms);

      for (let identity of identities) {
         version += identity.category + '/';
         version += identity.type + '/';
         version += identity.lang + '/';
         version += identity.name + '<';
      }

      for (let feature of features) {
         version += feature + '<';
      }

      for (let form of forms) {
         let fields = form.getFields().sort(this.sortFields);

         for (let field of fields) {
            if (field.getName() === 'FORM_TYPE') {
               version += field.getValues()[0] + '<';
            } else {
               version += field.getName() + '<';
               version += field.getValues().sort().join('<') + '<';
            }
         }
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

   protected sortForms(a: Form, b: Form) {
      if (a.getType() > b.getType()) {
         return 1;
      }

      if (a.getType() < b.getType()) {
         return -1;
      }

      return 0;
   }

   protected sortFields(a: FormField, b: FormField) {
      if (a.getName() > b.getName()) {
         return 1;
      }

      if (a.getName() < b.getName()) {
         return -1;
      }

      return 0;
   }
}
