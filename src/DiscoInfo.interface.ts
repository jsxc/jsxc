
export interface IIdentity {
   category: string
   type: string,
   name?: string,
   lang?: string
}

export interface IDiscoInfo {
   getIdentities(): IIdentity[]

   getFeatures(): string[]

   getForms()

   getFormByType(type: string)

   getCapsVersion(): String

   hasFeature(features: string[]): boolean
   hasFeature(feature: string): boolean
}
