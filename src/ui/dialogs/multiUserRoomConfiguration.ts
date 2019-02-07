import Dialog from '../Dialog'
import MultiUserContact from '../../MultiUserContact'
import Client from '../../Client'
import Form from '../../connection/Form'
import Log from '../../util/Log'
import { IConnection } from '@connection/Connection.interface';

let dialog: Dialog;

export const CANCELED = 'canceled';

export default function(contact: MultiUserContact) {

   //@TODO translate, maybe move to hbs
   dialog = new Dialog('<p class="jsxc-waiting">We are loading</p>', true);
   dialog.open();

   //@TODO multi account: selection dialog
   let connection = Client.getAccountManager().getAccount().getConnection();

   return connection.getMUCService().getRoomConfigurationForm(contact.getJid())
      .then(stanza => Form.fromXML(stanza))
      .then((form: Form) => {
         return showForm(form, contact, connection);
      });
}

function showForm(form: Form, contact: MultiUserContact, connection: IConnection) {
   let formElement = form.toHTML();
   //@TODO translate, maybe move to hbs
   let submitButton = $('<div class="form-group">\
      <div class="col-sm-offset-4 col-sm-8">\
         <button class="jsxc-button jsxc-button---default jsxc-js-close" type="button">{{t "Cancel"}}</button>\
         <button class="jsxc-button jsxc-button---primary" type="submit">{{t "Submit"}}</button>\
      </div>\
   </div>');

   formElement.append(submitButton);

   dialog.getDom().empty().append(formElement);

   return new Promise((resolve, reject) => {
      formElement.submit((ev) => { //@TODO block form
         ev.preventDefault();

         let form = Form.fromHTML(formElement.get(0));

         contact.setRoomConfiguration(form.toJSON());
         let submitPromise = connection.getMUCService()
            .submitRoomConfiguration(contact.getJid(), form)
            .then((stanza) => {
               Log.debug('Room configuration submitted');

               dialog.close();

               return stanza;
            });

         resolve(submitPromise);
      });

      formElement.find('.jsxc-js-close').click((ev) => {
         ev.preventDefault();

         let cancelRoomPromise = connection.getMUCService()
            .cancelRoomConfiguration(contact.getJid())
            .then(() => {
               Log.debug('Room configuration canceled');

               dialog.close();

               return CANCELED;
            });

         resolve(cancelRoomPromise);
      });
   })
}
