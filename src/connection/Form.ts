import { $build } from '../vendor/Strophe';
import InvalidParameterError from '../errors/InvalidParameterError';
import Field from './FormField';
import { IFormFieldJSONData } from './FormField';
import ItemField from './FormItemField';
import ReportField from './FormReportedField';

/**
 * XEP-0004: Data Forms
 *
 * @url https://xmpp.org/extensions/xep-0004.html
 */

const NAMESPACE = 'jabber:x:data';

type TYPE = 'cancel' | 'form' | 'result' | 'submit' | 'hidden';

export interface IFormJSONData {
   type: string;
   fields: IFormFieldJSONData[];
   instructions?: string;
   title?: string;
}

//@REVIEW xss

export default class Form {
   private ALLOWED_TYPES = ['cancel', 'form', 'result', 'submit', 'hidden'];

   public static fromXML(stanza) {
      let stanzaElement = $(stanza);
      let xElement =
         stanzaElement.attr('xmlns') === NAMESPACE && stanzaElement[0].tagName.toUpperCase() === 'X'
            ? stanzaElement
            : stanzaElement.find('x[xmlns="jabber:x:data"]');
      let type = xElement.attr('type');
      let instructions = xElement.find('>instructions').text();
      let title = xElement.find('>title').text();

      let fieldElements = xElement.find('>field');
      let fields = fieldElements.get().map(element => Field.fromXML($(element)));

      let reportedElement = xElement.find('>reported');
      let reportedFieldElements = reportedElement.find('>field');
      let reportedFields = reportedFieldElements.get().map(element => ReportField.fromXML($(element)));

      let itemElements = xElement.find('>item');
      let items = itemElements.get().map(itemElement => {
         let itemFieldElements = $(itemElement).find('>field');
         return itemFieldElements.get().map(itemFieldElement => ItemField.fromXML($(itemFieldElement)));
      });

      return new Form(type, fields, instructions, title, reportedFields, items);
   }

   public static fromJSON(data: IFormJSONData) {
      return new Form(
         data.type,
         data.fields.map(fieldData => Field.fromJSON(fieldData)),
         data.instructions,
         data.title
      );
   }

   public static fromHTML(element: Element): Form {
      let formElements = $(element).find('.jabber-x-data');

      let fields = formElements.get().map(formElement => {
         return Field.fromHTML($(formElement));
      });

      if ($(element).attr('data-type') !== 'form') {
         throw new Error('Can only process forms of type "form".');
      }

      return new Form('submit', fields);
   }

   private constructor(
      private type: string,
      private fields: Field[],
      private instructions?: string,
      private title?: string,
      private reportedFields?: ReportField[],
      private items?: Field[][]
   ) {
      if (this.ALLOWED_TYPES.indexOf(type) < 0) {
         throw new InvalidParameterError(
            `Form type not allowed! Instead of "${type}" try one of these: ${this.ALLOWED_TYPES.join(', ')}.`
         );
      }

      if (items && items.length > 0) {
         this.checkItems();
      }
   }

   private checkItems() {
      if (!this.reportedFields || this.reportedFields.length === 0) {
         return;
      }

      this.items.forEach((fields, itemIndex) => {
         if (fields.length !== this.reportedFields.length) {
            throw new InvalidParameterError(`Item ${itemIndex} does not contain all "reported" fields.`);
         }

         this.reportedFields.forEach((field, index) => {
            //because the order of reported fields must not be equal with the fields order we have to search the field name in reportedFields array
            //and cant simply use the same index here
            let reportedFieldsArray = this.reportedFields.map(rfield => rfield.getName());
            if (reportedFieldsArray.indexOf(fields[index].getName()) === -1) {
               throw new InvalidParameterError(`Item ${itemIndex} does not contain all "reported" fields.`);
            }
         });
      });
   }

   public toJSON() {
      return {
         type: this.type,
         fields: this.fields.map(field => field.toJSON()),
      };
   }

   public toXML() {
      let xmlElement = $build('x', {
         xmlns: 'jabber:x:data',
         type: this.type,
      });

      for (let field of this.fields) {
         xmlElement.cnode(field.toXML()).up();
      }

      return xmlElement.tree();
   }

   public toHTML() {
      if (this.type === 'form') {
         return this.toHTMLForm();
      } else if (this.type === 'result') {
         return this.toHTMLResult();
      }
   }

   private toHTMLForm() {
      let formElement = $('<form>');
      formElement.attr('data-type', this.type);
      formElement.attr('autocomplete', 'off');
      formElement.addClass('form-horizontal');

      if (this.title) {
         let headerElement = $('<h1>');
         headerElement.text(this.title);

         formElement.append(headerElement);
      }

      if (this.instructions) {
         let textElement = $('<p>');
         textElement.text(this.instructions);

         formElement.append(textElement);
      }

      for (let field of this.fields) {
         formElement.append(field.toHTML());
      }

      return formElement;
   }

   private toHTMLResult() {
      let tableElement = $('<table>');
      let tableHeader = $('<thead>');
      let headerRow = $('<tr>');
      let tableBody = $('<tbody>');

      this.reportedFields.forEach(field => {
         headerRow.append($('<th>').text(field.getName()));
      });

      tableHeader.append(headerRow).appendTo(tableElement);

      this.items.forEach(fieldRow => {
         let tableRow = $('<tr>');

         fieldRow.forEach(field => {
            $('<td>').text(field.getValues()[0]).appendTo(tableRow);
         });

         tableRow.appendTo(tableBody);
      });

      tableBody.appendTo(tableElement);

      return tableElement;
   }

   public getValues(key: string): string[] {
      let fields = this.fields.filter(field => field.getName() === key);

      return fields.length > 0 ? fields[0].getValues() : undefined;
   }

   public getFields(): Field[] {
      return this.fields;
   }

   public getType(): TYPE {
      return <TYPE>this.type;
   }

   public getTitle(): string | undefined {
      return this.title;
   }

   public getInstructions(): string | undefined {
      return this.instructions;
   }
}
