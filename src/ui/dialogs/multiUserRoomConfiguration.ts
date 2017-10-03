import Dialog from '../Dialog';
import JID from '../../JID';
import MultiUserContact from '../../MultiUserContact';
import Templates from '../../util/Templates'
import Client from '../../Client'
import Form from '../../connection/Form'
import Log from '../../util/Log'

let dialog:Dialog;

export default function(contact:MultiUserContact) {

   //@TODO translate, maybe move to hbs
   dialog = new Dialog('<p class="jsxc-waiting">We are loading</p>', false);
   dialog.open();

   let connection = Client.getAccount().getConnection();

   return connection.getRoomConfigurationForm(contact.getJid())
      .then(stanza => Form.fromXML(stanza))
      .then((form:Form) => {
         return showForm(form, contact, connection);
      });
}

function showForm(form:Form, contact:MultiUserContact, connection) {
   let formElement = form.toHTML();
   //@TODO translate, maybe move to hbs
   let submitButton = $('<div class="form-group">\
      <div class="col-sm-offset-4 col-sm-8">\
         <button class="jsxc-btn jsxc-btn-default jsxc-close" type="button">{{t "Cancel"}}</button>\
         <button class="jsxc-btn jsxc-btn-primary" type="submit">{{t "Submit"}}</button>\
      </div>\
   </div>');

   formElement.append(submitButton);

   dialog.getDom().empty().append(formElement);

   return new Promise((resolve, reject) => {
      formElement.submit((ev) => { //@TODO block form
         ev.preventDefault();

         let form = Form.fromHTML(formElement);

         contact.setRoomConfiguration(form.toJSON());
         let submitPromise = connection
            .submitRoomConfiguration(contact.getJid(), form)
            .then((stanza) => {
                Log.debug('Room configuration submitted');

                dialog.close();

                return stanza;
            });

         resolve(submitPromise);
      });

      formElement.find('.jsxc-close').click((ev) => {
         ev.preventDefault();

         let cancelRoomPromise = connection
            .cancelRoomConfiguration(contact.getJid())
            .then(() => {
               Log.debug('Room configuration canceled');

               dialog.close();

               return 'canceled';
            });

         resolve(cancelRoomPromise);
      });
   })
}
