import DiscoInfo from './DiscoInfo'

export default class DiscoInfoChangable extends DiscoInfo {

   constructor(id: string) {
      super(id);
   }

   public addIdentity(category: string, type: string, name: string = '', lang: string = ''): boolean {
      let identities = this.getIdentities();

      for (let identity of identities) {
         if (identity.category === category &&
            identity.type === type &&
            identity.name === name &&
            identity.lang === lang) {
            return false;
         }
      }

      identities.push({
         category: category,
         type: type,
         name: name,
         lang: lang
      });
      this.data.set('identities', identities);

      return true;
   }

   public addFeature(feature: string): boolean {
      let features = this.getFeatures();

      if (features.indexOf(feature) > -1) {
         return false;
      }

      features.push(feature);
      this.data.set('features', features);

      return true;
   }

   public removeFeature(feature: string): boolean {
      let features = this.getFeatures();
      let index = features.indexOf(feature);

      if (index > -1) {
         features.splice(index, 1);
         this.data.set('features', features);

         return true;
      }

      return false;
   }
}
