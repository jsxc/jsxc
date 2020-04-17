import { $build } from '../vendor/Strophe'

export interface IFormFieldData {
   label?: string,
   type?: string,
   name: string,
   description?: string,
   isRequired?: boolean,
   values?: string[],
   options?: Option2[]
}

export interface IFormFieldJSONData {
   type?: string,
   name: string,
   values: string[]
}

class Option2 {
   public static fromXML(optionElement) {
      let label = optionElement.attr('label'); //optional
      let value = optionElement.find('value').text();

      return new Option2(label, value);
   }

   private constructor(private label: string, private value: string) {

   }

   public getValue(): string {
      return this.value;
   }

   public toHTML() {
      let optionElement = $('<option>');

      optionElement.text(this.label || this.value);
      optionElement.attr('value', this.value);

      return optionElement;
   }
}

export default class FormField {
   private ALLOWED_TYPES = ['boolean', 'fixed', 'hidden', 'jid-multi', 'jid-single', 'list-multi', 'list-single', 'text-multi', 'text-private', 'text-single'];

   public static fromXML(fieldElement) {
      return new FormField({
         label: fieldElement.attr('label'), // MAY
         type: (fieldElement.attr('type') || 'text-single').toLowerCase(),
         name: fieldElement.attr('var'), // MUST, if type != fixed. Unique, if form != result
         description: fieldElement.find('desc').text(), // MAY
         isRequired: fieldElement.find('required').length > 0, // MAY
         values: fieldElement.find('>value').map((index, element) => $(element).text()).get(), // MAY
         options: fieldElement.find('option').map((index, element) => Option2.fromXML($(element))).get() // MAY
      })
   }

   public static fromHTML(formElement) {
      formElement = $(formElement);
      let type = formElement.attr('data-type');
      let name = formElement.attr('data-name');
      let values;

      switch (type) {
         case 'list-multi':
         case 'list-single':
            values = formElement.find('select').val();
            break;
         case 'text-multi':
         case 'jid-multi':
            values = formElement.find('textarea').text().split('\n');
            break;
         case 'boolean':
            values = formElement.find('input').prop('checked') ? '1' : '0';
            break;
         default:
            values = formElement.find('input').val();
      }

      if (!(values instanceof Array)) {
         values = [values];
      }

      if (type === 'list-single' && values.length > 1) {
         throw new Error('list-single should have only one selected option.');
      }

      return new FormField({
         type,
         name,
         values,
      });
   };

   public static fromJSON(data: IFormFieldJSONData) {
      return new FormField(data);
   }

   constructor(private data: IFormFieldData) {
      if (this.ALLOWED_TYPES.indexOf(data.type) < 0) {
         this.data.type = 'text-single'; //default value according to XEP-0004
      }

      if (!this.data.values) {
         this.data.values = [];
      }

      if (this.data.values.length > 1 && ['jid-multi', 'list-multi', 'text-multi', 'hidden'].indexOf(this.data.type) < 0) {
         throw new Error('Fields of type ' + data.type + ' are not allowed to have multiple value elements.');
      }

      if (!this.data.options) {
         this.data.options = [];
      }

      if (this.data.options.length > 0 && ['list-multi', 'list-single'].indexOf(this.data.type) < 0) {
         throw new Error('Only fields of type list-multi or list-single are allowed to have option elements.');
      }
   }

   public getName(): string {
      return this.data.name;
   }

   public getValues(): string[] {
      return this.data.values;
   }

   public toJSON() {
      return {
         type: this.data.type,
         name: this.data.name,
         values: this.data.values
      };
   }

   public toXML() {
      let xmlElement = $build('field', {
         type: this.data.type,
         var: this.data.name
      });

      for (let value of this.data.values) {
         xmlElement.c('value').t(value).up();
      }

      return xmlElement.tree();
   }

   public toHTML() {
      let element;

      switch (this.data.type) {
         case 'fixed':
            element = $('<div>').append($(this.data.values).map((index, value) => $('<p>').text(<any> value).get()));
            break;
         case 'boolean':
         case 'hidden':
         case 'jid-single':
         case 'text-private':
         case 'text-single':
            element = this.createInputElement();
            break;
         case 'jid-multi':
         case 'text-multi':
            element = this.createTextareaElement();
            break;
         case 'list-multi':
         case 'list-single':
            element = this.createSelectElement();
            break;
      }

      //@TODO add description

      element.attr('name', this.data.name);

      if (this.data.isRequired) {
         element.attr('required', 'required');
      }

      if (this.data.type !== 'boolean') {
         let id = this.data.name; //@REVIEW is this unique enough
         let groupElement = $('<div>');
         groupElement.addClass('form-group');

         if (this.data.label) {
            let labelElement = $('<label>');
            labelElement.text(this.data.label);
            labelElement.attr('for', id);
            labelElement.addClass('col-sm-4');

            element.attr('id', id);
            element.addClass('col-sm-8');

            groupElement.append(labelElement);
         }

         groupElement.append(element);

         element = groupElement;
      }

      if (this.data.type !== 'fixed') {
         element.addClass('jabber-x-data');
         element.attr('data-type', this.data.type);
         element.attr('data-name', this.data.name);
      }

      return element;
   }

   private createInputElement() {
      let element = $('<input>');
      element.attr('autocomplete', 'off');

      if (this.data.values.length > 0) {
         element.attr('value', this.data.values[0]);
      }

      switch (this.data.type) {
         case 'boolean':
            element.attr('type', 'checkbox');
            let value = this.data.values.length === 1 ? this.data.values[0] : 0;
            if (value === 'true' || value === '1') {
               element.attr('checked', 'checked');
            }
            if (this.data.label) {
               element = $('<label>').append(element);
               element.addClass('col-sm-8 col-sm-offset-4');
               element.append(this.data.label);
               element = $('<div>').addClass('checkbox').append(element); //@REVIEW
               element = $('<div>').addClass('form-group').append(element);
            }
            break;
         case 'hidden':
            element.attr('type', 'hidden');
            break;
         case 'jid-single':
            element.attr('type', 'email'); //@REVIEW no jids with resources
            break;
         case 'text-private':
            element.attr('type', 'password');
            element.attr('autocomplete', 'new-password');
            break;
         case 'text-single':
            element.attr('type', 'text');
            break;
      }

      return element;
   }

   private createTextareaElement() {
      let element = $('<textarea>');

      if (this.data.values.length > 0) {
         element.text(this.data.values.join('\n'));
      }

      return element;
   }

   private createSelectElement() {
      let element = $('<select>');

      if (this.data.type === 'list-multi') {
         element.attr('multiple', 'multiple');
      }

      let options = this.data.options.map((option) => {
         let optionElement = option.toHTML();

         if (this.data.values.indexOf(option.getValue()) > -1) {
            optionElement.attr('selected', 'selected');
         }

         return optionElement;
      });

      for (let option of options) {
         element.append(option);
      }

      return element;
   }
}
