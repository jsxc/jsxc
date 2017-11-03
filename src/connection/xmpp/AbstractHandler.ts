import Account from '../../Account'

export default abstract class AbstractHandler {
   protected PRESERVE_HANDLER = true;
   protected REMOVE_HANDLER = false;

   constructor(protected account: Account) {

   }

   public abstract processStanza(stanza: Element): boolean;
}
