import Form from '@connection/Form';
import FormField from '@connection/FormField';
import { IIdentity } from './DiscoInfo.interface';
import * as sha1 from 'sha1'

export default class DiscoInfoVersion {
   public static generate(identities: IIdentity[], features: string[], forms: Form[] = []): string {
      let version = '';

      identities = identities.sort(DiscoInfoVersion.sortIdentities);
      features = features.sort().filter((value, index, source) => source.indexOf(value) === index);
      forms = forms.sort(DiscoInfoVersion.sortForms);

      for (let identity of identities) {
         version += identity.category + '/';
         version += identity.type + '/';
         version += (identity.lang || '') + '/';
         version += (identity.name || '') + '<';
      }

      for (let feature of features) {
         version += feature + '<';
      }

      for (let form of forms) {
         let fields = form.getFields().sort(DiscoInfoVersion.sortFields);

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

   private static sortIdentities(a, b) {
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

   private static sortForms(a: Form, b: Form) {
      if (a.getType() > b.getType()) {
         return 1;
      }

      if (a.getType() < b.getType()) {
         return -1;
      }

      return 0;
   }

   private static sortFields(a: FormField, b: FormField) {
      if (a.getName() > b.getName()) {
         return 1;
      }

      if (a.getName() < b.getName()) {
         return -1;
      }

      return 0;
   }
}
