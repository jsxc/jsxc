import { Strophe, $build, $iq } from '../../vendor/Strophe'
import UUID from '../../util/UUID';
import BaseError from '../../errors/BaseError';
import Form from '../../connection/Form'
import Translation from '../../util/Translation'
import Log from '../../util/Log'
import Dialog from '../../ui/Dialog'

const NS_REGISTER = 'jabber:iq:register';
const ALLOWED_FIELDS = ['username', 'nick', 'password', 'name', 'first', 'last', 'email', 'address', 'city', 'state', 'zip', 'phone', 'url', 'date'];

export function register(service: string, domain: string, callback?: (form: Form) => Promise<Form>) {
   return new Registration(service, domain).requestForm(callback || defaultCallback);
}

function defaultCallback(form: Form): Promise<Form> {
   let wrapper = $('<div>').append(form.toHTML());
   let dialog = new Dialog(wrapper.html());
   let dom = dialog.open();
   let buttonElement = $('<button>');
   buttonElement.addClass('jsxc-button jsxc-button--primary');
   buttonElement.text(Translation.t('Register'));
   buttonElement.appendTo(dom.find('form'));

   return new Promise(resolve => {
      dom.find('form').submit(function(ev) {
         ev.preventDefault();

         resolve(Form.fromHTML(this));
      });
   });
}

class Registration {
   private isDataForm: boolean = false;

   private connection: Connection;

   constructor(service: string, domain: string) {
      this.connection = new Connection(service, domain);
   }

   public requestForm(callback: (form: Form) => Promise<Form>) {
      let queryStanza = $build('query', {
         xmlns: NS_REGISTER,
      });

      return this.connection.sendIQ(queryStanza).then((iqStanza) => {
         let form = this.getFormFromResult(iqStanza);

         return callback(form);
      }).then(this.submitForm).catch(err => {
         Log.info('Error during registration callback', err);

         throw err;
      });
   }

   private getFormFromResult = (iqStanza) => {
      let queryStanza = iqStanza.find(`query[xmlns="${NS_REGISTER}"]`);

      if (queryStanza.length !== 1) {
         throw new Error('Error');
      }

      if (queryStanza.find('registered').length > 0) {
         throw new BaseError('User is already registered');
      }

      let formStanza = queryStanza.find(`x[type="form"][xmlns="jabber:x:data"]`);

      if (formStanza.length === 1) {
         this.isDataForm = true;

         return Form.fromXML(formStanza);
      }

      let formData = {
         type: 'form',
         title: Translation.t('Registration'),
         instructions: queryStanza.find('>instructions').text(),
         fields: []
      };

      for (let allowedField of ALLOWED_FIELDS) {
         if (queryStanza.find('>' + allowedField).length > 0) {
            formData.fields.push({
               type: allowedField === 'password' ? 'text-private' : 'text-single',
               name: allowedField,
               label: allowedField,
               values: [],
            });
         }
      }

      let redirection = queryStanza.find('>x[xmlns="jabber:x:oob"] url').text();

      if (redirection) {
         formData.fields.push({
            type: 'fixed',
            name: 'redirect',
            values: ['redirection'],
         });
      }

      return Form.fromJSON(formData);
   }

   public submitForm = (form: Form) => {
      let queryStanza = $build('query', {
         xmlns: NS_REGISTER,
      });

      if (this.isDataForm) {
         queryStanza.cnode(form.toXML());
      } else {
         for (let allowedField of ALLOWED_FIELDS) {
            let values = form.getValues(allowedField);

            if (values && values.length === 1) {
               queryStanza.c(allowedField, values[0]).up();
            }
         }
      }

      return this.connection.sendIQ(queryStanza, 'set');
   }
}

class Connection {
   private sid: string;
   private rid = parseInt((Math.random() * 100000).toString(), 10);

   constructor(private service: string, private domain: string) {

   }

   public send(childStanza: Strophe.Builder): Promise<JQuery> {
      let stanza = $build('body', this.getBodyAttributes())
      stanza.cnode(childStanza.tree());

      return new Promise((resolve, reject) => {
         $.ajax({
            type: 'POST',
            url: this.service,
            data: stanza.toString(),
            global: false,
            dataType: 'xml',
            success: data => {
               this.sid = $(data).attr('sid');
               this.rid++;

               resolve(data);
            },
            error: (data) => reject(data),
         });
      });
   }

   public sendIQ(childStanza: Strophe.Builder, type: 'get' | 'set' = 'get'): Promise<JQuery> {
      let id = UUID.v4();

      let iq = $iq({
         id,
         type,
         xmlns: Strophe.NS.CLIENT,
      }).cnode(childStanza.tree());

      return this.send(iq).then(stanza => {
         let iqResultStanza = $(stanza).find(`iq[type="result"][id="${id}"]`);

         if (iqResultStanza.length !== 1) {
            throw stanza;
         }

         return iqResultStanza;
      });
   }

   private getBodyAttributes() {
      if (this.sid) {
         return {
            sid: this.sid,
            rid: this.rid,
            xmlns: Strophe.NS.HTTPBIND,
         };
      }

      return {
          'to ': this.domain,
         'xml:lang': 'en',
          'wait ': 60,
          'hold ': 1,
          'content ': 'text/xml; charset=utf-8',
          'ver ': '1.6',
          'rid ': this.rid,
         'xmpp:version': '1.0',
         'xmlns:xmpp': Strophe.NS.BOSH,
         'xmlns': Strophe.NS.HTTPBIND,
      }
   }
}
