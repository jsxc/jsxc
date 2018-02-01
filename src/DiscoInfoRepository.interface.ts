import { IContact as Contact } from './Contact.interface'
import { IJID as JID } from './JID.interface'
import { DiscoInfo } from './DiscoInfo.interface'

export interface DiscoInfoRepository {
   addRelation(jid: JID, version: string)
   addRelation(jid: JID, discoInfo: DiscoInfo)

   getDiscoInfo(jid: JID)

   getCapableResources(contact: Contact, features: string[]): Promise<Array<string>>
   getCapableResources(contact: Contact, features: string): Promise<Array<string>>

   hasFeature(jid: JID, features: string[]): Promise<{}>
   hasFeature(jid: JID, feature: string): Promise<{}>
   hasFeature(discoInfo: DiscoInfo, features: string[]): Promise<{}>
   hasFeature(discoInfo: DiscoInfo, feature: string): Promise<{}>

   getCapabilities(jid: JID): Promise<DiscoInfo | void>

   requestDiscoInfo(jid: JID, node?: string)
}
