import Dialog from '../Dialog'
import Client from '../../Client'
import JID from '../../JID'
import { IConnection } from '../../connection/Connection.interface'
import TableElement from '../util/TableElement'
import Translation from '../../util/Translation'
import Log from '../../util/Log'
import Account from '@src/Account';
import MultiUserContact from '@src/MultiUserContact';

let multiUserJoinTemplate = require('../../../template/multiUserJoin.hbs');

const ENTER_KEY = 13;

export default function() {
   new MultiUserJoinDialog();
}

class MultiUserJoinDialog {
   private account: Account;
   private connection: IConnection;
   private defaultNickname;

   private dialog;
   private dom;
   private serverInputElement;
   private roomInputElement;
   private passwordInputElement;
   private nicknameInputElement;
   private bookmarkInputElement;

   constructor() {
      let content = multiUserJoinTemplate({});

      this.dialog = new Dialog(content);
      let dom = this.dom = this.dialog.open();

      this.serverInputElement = dom.find('input[name="server"]');
      this.roomInputElement = dom.find('input[name="room"]');
      this.passwordInputElement = dom.find('input[name="password"]');
      this.nicknameInputElement = dom.find('input[name="nickname"]');
      this.bookmarkInputElement = dom.find('input[name="bookmark"]');

      this.account = Client.getAccountManager().getAccount();
      this.connection = this.account.getConnection();
      this.defaultNickname = this.connection.getJID().node;

      this.initializeInputElements();
   }

   private initializeInputElements() {
      this.showContinueElements();

      this.serverInputElement.on('change', () => {
         this.dom.find('.jsxc-inputinfo.jsxc-server').text('').hide();

         let jid = new JID(this.serverInputElement.val(), '');

         this.getMultiUserRooms(jid);
      })

      this.getMultiUserServices().then((services: JID[]) => {
         this.serverInputElement.val(services[0].full);
         this.serverInputElement.trigger('change');
      });

      this.nicknameInputElement.attr('placeholder', this.defaultNickname);

      this.bookmarkInputElement.change(function() {
         if ($(this).prop('checked')) {
            this.autoJoinInputElement.prop('disabled', false);
            this.autoJoinInputElement.parents('.checkbox').removeClass('disabled');
         } else {
            this.autoJoinInputElement.prop('disabled', true).prop('checked', false);
            this.autoJoinInputElement.parents('.checkbox').addClass('disabled');
         }
      });

      this.dom.find('input[type="text"], input[type="password"]').keydown(() => {
         this.emptyStatusElement();
         this.showContinueElements();
      }).keyup((ev) => {
         if (ev.which === ENTER_KEY) {
            this.continueHandler(ev);
         }
      });

      this.dom.find('.jsxc-continue').click(this.continueHandler);
      this.dom.find('.jsxc-join').click(this.joinHandler);
   }

   private showContinueElements() {
      this.dom.find('.jsxc-continue').show();
      this.dom.find('.jsxc-join').hide();
   }

   private showJoinElements() {
      this.dom.find('.jsxc-continue').hide();
      this.dom.find('.jsxc-join').show();
   }

   private getMultiUserServices() {
      let ownJid = this.connection.getJID();
      let serverJid = new JID('', ownJid.domain, '');
      let discoInfoRepository = this.account.getDiscoInfoRepository();

      return this.connection.getDiscoService().getDiscoItems(serverJid).then((stanza) => {
         let promises = [];

         $(stanza).find('item').each((index, element) => {
            let jid = new JID('', $(element).attr('jid'), '');

            //@TODO cache
            let promise = discoInfoRepository.requestDiscoInfo(jid).then((discoInfo) => {
               return discoInfoRepository.hasFeature(discoInfo, 'http://jabber.org/protocol/muc');
            }).then((hasFeature) => {
               return hasFeature ? jid : undefined;
            }).catch((stanza) => {
               const from = $(stanza).attr('from') || '';
            
               Log.info(`Ignore ${from} as MUC provider, because could not load disco info.`);
            });

            promises.push(promise);
         });

         return Promise.all(promises).then((results) => {
            return results.filter(jid => typeof jid !== 'undefined');
         });
      })
   }

   private getMultiUserRooms(server: JID) {
      Log.debug('Load room list for ' + server.bare);

      let roomInfoElement = this.dom.find('.jsxc-inputinfo.jsxc-room');
      roomInfoElement.show();
      roomInfoElement.addClass('jsxc-waiting')
      roomInfoElement.text(Translation.t('Rooms_are_loaded'));

      this.connection.getDiscoService().getDiscoItems(server)
         .then(this.parseRoomList)
         .catch(this.parseRoomListError)
         .then(() => {
            roomInfoElement.removeClass('jsxc-waiting');
         })
   }

   private parseRoomList = (stanza) => {
      // workaround: chrome does not display dropdown arrow for dynamically filled datalists
      $('#jsxc-roomlist select').empty();

      $(stanza).find('item').each(function() {
         let optionElement = $('<option>');
         let jid = new JID($(this).attr('jid'));
         let name = $(this).attr('name') || jid.node;

         optionElement.text(name);
         optionElement.attr('data-jid', jid.full);
         optionElement.attr('value', jid.node);

         $('#jsxc-roomlist select').append(optionElement);
      });

      let set = $(stanza).find('set[xmlns="http://jabber.org/protocol/rsm"]');
      let roomInfoElement = this.dom.find('.jsxc-inputinfo.jsxc-room');

      if (set.length > 0) {
         let count = set.find('count').text() || '?';

         roomInfoElement.text(Translation.t('Could_load_only', {
            count
         }));
      } else {
         roomInfoElement.text('').hide();
      }
   }

   private parseRoomListError = (stanza) => {
      let serverInfoElement = this.dom.find('.jsxc-inputinfo.jsxc-server');
      let roomInfoElement = this.dom.find('.jsxc-inputinfo.jsxc-room');
      let errTextMsg = $(stanza).find('error text').text() || null;

      Log.warn('Could not load rooms', errTextMsg);

      if (errTextMsg) {
         serverInfoElement.show().text(errTextMsg);
      }

      roomInfoElement.text('').hide();
      $('#jsxc-roomlist select').empty();
   }

   private continueHandler = (ev) => {
      ev.preventDefault();

      //@REVIEW maybe lock inputs
      this.testInputValues()
         .then(this.requestRoomInfo)
         .then(() => {
            this.showJoinElements();
         }).catch((msg) => {
            this.setStatusMessage(msg, 'warning');

            Log.warn(msg)
         })

      return false;
   }

   private testInputValues(): Promise<JID | void> {
      let room = <string> this.roomInputElement.val();
      let server = this.serverInputElement.val();

      if (!room || !room.match(/^[^"&\'\/:<>@\s]+$/i)) {
         this.roomInputElement.addClass('jsxc-invalid').keyup(function() {
            if ($(this).val()) {
               $(this).removeClass('jsxc-invalid');
            }
         });

         return Promise.reject('MUC room JID invalid');
      }

      if (this.serverInputElement.hasClass('jsxc-invalid')) {
         return Promise.reject('MUC server invalid');
      }

      if (!room.match(/@(.*)$/)) {
         room += '@' + server;
      }

      let roomJid = new JID(room);

      if (this.account.getContact(roomJid)) {
         return Promise.reject('You_already_joined_this_room');
      }

      this.dom.find('input[name="room-jid"]').val(room);

      return Promise.resolve(roomJid);
   }

   private requestRoomInfo = (room: JID) => {
      this.setWaitingMessage('Loading_room_information');

      return this.connection.getDiscoService().getDiscoInfo(room)
         .then(this.parseRoomInfo)
         .then((roomInfoElement) => {
            this.setStatusElement(roomInfoElement);
         }).catch((stanza) => {
            if ($(stanza).find('item-not-found').length > 0) {
               this.setStatusMessage(Translation.t('Room_not_found_'));

               return Promise.resolve();
            }

            return Promise.reject('I was not able to get any room information.');
         }).then(() => {
            return room;
         });
   }

   private parseRoomInfo = (stanza) => {
      let roomInfoElement = $('<div>');
      roomInfoElement.append(`<p>${Translation.t('This_room_is')}</p>`);

      //@TODO test for feature with muc ns

      let tableElement = new TableElement(2);

      $(stanza).find('feature').each((index, featureElement) => {
         let feature = $(featureElement).attr('var');

         //@REVIEW true?
         if (feature !== '' && true && feature !== 'http://jabber.org/protocol/muc') {
            tableElement.appendRow(
               Translation.t(`${feature}.keyword`),
               Translation.t(`${feature}.description`)
            );
         }

         if (feature === 'muc_passwordprotected') {
            this.passwordInputElement.parents('.form-group').removeClass('jsxc-hidden');
            this.passwordInputElement.attr('required', 'required');
            this.passwordInputElement.addClass('jsxc-invalid');
         }
      });

      let name = $(stanza).find('identity').attr('name');
      let subject = $(stanza).find('field[var="muc#roominfo_subject"]').attr('label');

      tableElement.appendRow('Name', name);
      tableElement.appendRow('Subject', subject);

      roomInfoElement.append(tableElement.get());

      roomInfoElement.append($('<input type="hidden" name="room-name">').val(name));
      roomInfoElement.append($('<input type="hidden" name="room-subject">').val(subject));

      //@TODO display subject, number of occupants, etc.

      return roomInfoElement;
   }

   private joinHandler = (ev) => {
      ev.preventDefault();

      //@TODO disable handler, show spinner

      let jid = new JID(this.dom.find('input[name="room-jid"]').val());
      let name = this.dom.find('input[name="room-name"]').val() || undefined;
      let nickname = this.nicknameInputElement.val() || this.defaultNickname;
      // let bookmark = this.bookmarkInputElement.prop('checked');
      // let autojoin = this.autoJoinInputElement.prop('checked');
      let password = this.passwordInputElement.val() || undefined;
      let subject = this.dom.find('input[name="room-subject"]').val() || undefined;

      let multiUserContact = new MultiUserContact(this.account, jid, name);
      multiUserContact.setNickname(nickname);
      multiUserContact.setBookmark(true);
      multiUserContact.setAutoJoin(true);
      multiUserContact.setPassword(password);
      multiUserContact.setSubscription(subject);

      this.account.getContactManager().add(multiUserContact);

      multiUserContact.join();
      multiUserContact.getChatWindowController().openProminently();

      this.dialog.close();

      return false;
   }

   private setWaitingMessage(msg: string) {
      this.setStatusMessage(msg, 'waiting');
   }

   private setStatusMessage(msg: string, level?: 'waiting' | 'warning') {
      let textElement = $('<p>').text(msg)

      if (level) {
         textElement.addClass('jsxc-' + level);
      }

      this.setStatusElement(textElement);
   }

   private setStatusElement(element) {
      let messageElement = this.dom.find('.jsxc-status-container');

      messageElement.empty();
      messageElement.append(element);
   }

   private emptyStatusElement() {
      this.dom.find('.jsxc-status-container').empty();
   }
}
