import Dialog from '../Dialog';
import Options from '../../Options';

var settingsTemplate = require('../../../template/settings.hbs');

export default function() {
   let xmppSettingsAlterable = Options.get('xmpp').overwrite !== 'false' && Options.get('xmpp').overwrite !== false;

   var content = settingsTemplate({
      xmppSettingsAlterable: xmppSettingsAlterable
   });
   var dialog = new Dialog(content);
   var dom = dialog.open();

   dom.find('form').each(function() {
      prepareForm($(this));
   });

   dom.find('form').submit(function(ev) {
      ev.preventDefault();

      processSubmit($(this));
   });
}

function prepareForm(form) {
   form.find('input[type!="submit"]').each(function() {
      var id = this.id.split("-");
      var prop = id[0];
      var key = id[1];
      var type = this.type;

      var data = Options.get(prop);

      if (data && typeof data[key] !== 'undefined') {
         if (type === 'checkbox') {
            if (data[key] !== 'false' && data[key] !== false) {
               this.checked = 'checked';
            }
         } else {
            $(this).val(data[key]);
         }
      }
   });
}

function processSubmit(form) {
   // var data = {};
   //
   // form.find('input[type!="submit"]').each(function() {
   //    var id = this.id.split("-");
   //    var prop = id[0];
   //    var key = id[1];
   //    var val;
   //    var type = this.type;
   //
   //    if (type === 'checkbox') {
   //       val = this.checked;
   //    } else {
   //       val = $(this).val();
   //    }
   //
   //    if (!data[prop]) {
   //       data[prop] = {};
   //    }
   //
   //    data[prop][key] = val;
   // });
   //
   // $.each(data, function(key, val) {
   //    Options.set(key, val);
   // });
   //
   // var cb = function(success) {
   //    if (typeof form.attr('data-onsubmit') === 'string') {
   //       jsxc.exec(form.attr('data-onsubmit'), [success]);
   //    }
   //
   //    setTimeout(function() {
   //       if (success) {
   //          form.find('button[type="submit"]').switchClass('btn-primary', 'btn-success');
   //       } else {
   //          form.find('button[type="submit"]').switchClass('btn-primary', 'btn-danger');
   //       }
   //       setTimeout(function() {
   //          form.find('button[type="submit"]').switchClass('btn-danger btn-success', 'btn-primary');
   //       }, 2000);
   //    }, 200);
   // };
   //
   // Options.saveSettinsPermanent.call(this, data, cb);
}
