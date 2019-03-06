import { AbstractPlugin } from './AbstractPlugin'
import { IContact } from '../Contact.interface'

export abstract class EncryptionPlugin extends AbstractPlugin {
   public abstract toggleTransfer(contact: IContact): Promise<void>;
}
