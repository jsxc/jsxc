import AbstractHandler from '../AbstractHandler'

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
      //@TODO handle headline message

      return this.PRESERVE_HANDLER;
   }
}
