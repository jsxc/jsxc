
interface Identity {
   category: string
   type: string,
   name?: string,
   lang?: string
}

export interface DiscoInfo {
   getIdentities(): string[]

   getFeatures(): string[]

   getForms()

   getFormByType(type: string)

   getCapsVersion(): String

   hasFeature(features: string[]): boolean
   hasFeature(feature: string): boolean
}
