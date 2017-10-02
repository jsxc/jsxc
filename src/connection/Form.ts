
const NAMESPACE = 'jabber:x:data';

class Form {
   private ALLOWED_TYPES = ['cancel', 'form', 'result', 'submit'];

   public static fromXML(stanza) {
      let stanzaElement = $(stanza);
      let xElement = stanzaElement.attr('xmlns') === NAMESPACE && stanzaElement[0].tagName === 'x' ? stanzaElement : stanzaElement.find('x[xmlns="jabber:x:data"]');
      let type = xElement.attr('type');
      let instructions = xElement.find('instructions').text();
      let title = xElement.find('title').text();

      let fieldElements = xElement.find('field');
      let fields = fieldElements.map((index, element) => Field.fromXML(element)).get();

      let reportedElement = xElement.find('reported');
      //@TODO handle reported and item elements

      return new Form(type, instructions, title, fields);
   }

   public static fromHTML(element:Element) {

   }

   private constructor(private type:string, private instructions:string, private title:string, private fields:Field[]) {
      if (this.ALLOWED_TYPES.indexOf(type) < 0) {
         throw 'Form type not allowed';
      }
   }

   public toXML() {

   }

   public toHTML() {
      let formElement = $('<form>');
      formElement.attr('data-type', this.type);

      if (this.title) {
         let headerElement = $('<h1>');
         headerElement.text(this.title);

         formElement.append(headerElement)
      }

      if (this.instructions) {
         let textElement = $('<p>');
         textElement.text(this.instructions);

         formElement.append(textElement)
      }

      for(let field of this.fields) {

      }
   }
}

interface FieldData {
   label:string,
   type:string,
   name:string,
   description:string,
   isRequired:boolean,
   values:string[],
   options:Option2[]
}

class Field {
   private ALLOWED_TYPES = ['boolean', 'fixed', 'hidden', 'jid-multi', 'jid-single', 'list-multi', 'list-single', 'text-multi', 'text-private', 'text-single'];

   public static fromXML(fieldElement) {
      return new Field({
         label: fieldElement.attr('label'),
         type: fieldElement.attr('type'),
         name: fieldElement.attr('var'),
         description: fieldElement.find('desc').text(),
         isRequired: fieldElement.find('required').length > 0,
         values: fieldElement.find('value').map((index, element) => element.text()).get(),
         options: fieldElement.find('option').map((index, element) => Option2.fromXML(element)).get()
      })
   }

   private constructor(private data:FieldData) {
      if (this.ALLOWED_TYPES.indexOf(data.type) < 0) {
         throw 'Field type not allowed';
      }
   }

   public toHTML() {

   }
}

class Option2 {
   public static fromXML(optionElement) {
      let label = optionElement.attr('label');
      let value = optionElement.text();

      return new Option2(label, value);
   }

   private constructor(private label:string, private value:string) {

   }
}
