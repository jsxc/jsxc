import { IContact as Contact } from './Contact.interface'
import { IJID as JID } from './JID.interface'
import { IDiscoInfo } from './DiscoInfo.interface'

export interface IDiscoInfoRepository {
   addRelation(jid: JID, version: string)
   addRelation(jid: JID, discoInfo: IDiscoInfo)

   getDiscoInfo(jid: JID)

   getCapableResources(contact: Contact, features: string[]): Promise<string[]>
   getCapableResources(contact: Contact, features: string): Promise<string[]>

   hasFeature(jid: JID, features: string[]): Promise<boolean>
   hasFeature(jid: JID, feature: string): Promise<boolean>
   hasFeature(discoInfo: IDiscoInfo, features: string[]): Promise<boolean>
   hasFeature(discoInfo: IDiscoInfo, feature: string): Promise<boolean>

   getCapabilities(jid: JID): Promise<IDiscoInfo | void>

   requestDiscoInfo(jid: JID, node?: string)
}
