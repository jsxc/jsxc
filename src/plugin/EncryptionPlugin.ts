import {AbstractPlugin} from './AbstractPlugin'
import Contact from '../Contact'

export abstract class EncryptionPlugin extends AbstractPlugin {
   public abstract toggleTransfer(contact:Contact);
}
