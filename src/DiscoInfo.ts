import PersistentMap from './util/PersistentMap'
import Client from './Client'
import Form from './connection/Form'
import { IDiscoInfo, IIdentity } from './DiscoInfo.interface'
import DiscoInfoVersion from './DiscoInfoVersion';

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
         this.version = DiscoInfoVersion.generate(arguments[0], arguments[1], arguments[2]);
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
}
