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

export default function(server?: string, room?: string) {
   new MultiUserJoinDialog(server, room);
}

class MultiUserJoinDialog {
   private account: Account;
   private connection: IConnection;
   private defaultNickname: string;

   private dialog: Dialog;
   private dom: JQuery<HTMLElement>;
   private accountElement: JQuery<HTMLElement>;
   private serverInputElement: JQuery<HTMLElement>;
   private roomInputElement: JQuery<HTMLElement>;
   private passwordInputElement: JQuery<HTMLElement>;
   private nicknameInputElement: JQuery<HTMLElement>;

   constructor(private server?: string, private room?: string) {
      let content = multiUserJoinTemplate({
         accounts: Client.getAccountManager().getAccounts().map(account => ({
            uid: account.getUid(),
            jid: account.getJID().bare,
         })),
      });

      this.dialog = new Dialog(content);
      let dom = this.dom = this.dialog.open();

      this.accountElement = dom.find('select[name="account"]');
      this.serverInputElement = dom.find('input[name="server"]');
      this.roomInputElement = dom.find('input[name="room"]');
      this.passwordInputElement = dom.find('input[name="password"]');
      this.nicknameInputElement = dom.find('input[name="nickname"]');

      if (server && room) {
         this.serverInputElement.val(server);
         this.roomInputElement.val(room);
      } else {
         this.updateAccount(Client.getAccountManager().getAccount().getUid());
      }

      this.initializeInputElements();
   }

   private updateAccount(id: string) {
      this.account = Client.getAccountManager().getAccount(id);

      this.connection = this.account.getConnection();
      this.defaultNickname = this.connection.getJID().node;

      this.nicknameInputElement.attr('placeholder', this.defaultNickname);

      this.getMultiUserServices().then((services: JID[]) => {
         this.serverInputElement.val(services[0].full);
         this.serverInputElement.trigger('change');
      });
   }

   private initializeInputElements() {
      this.showContinueElements();

      this.accountElement.on('change', () => {
         let accountId = <string> this.accountElement.val();

         if (!this.server || !this.room) {
            this.updateAccount(accountId);
         }
      });

      this.serverInputElement.on('change', () => {
         this.dom.find('.jsxc-inputinfo.jsxc-server').text('').hide();

         let jid = new JID(<string> this.serverInputElement.val(), '');

         this.getMultiUserRooms(jid);
      })

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

      this.dom.find('input, select').prop('disabled', true);
      this.testInputValues()
         .then(this.requestRoomInfo)
         .then(() => {
            this.showJoinElements();
         }).catch((msg) => {
            this.dom.find('input, select').prop('disabled', false);
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

      let jid = new JID(<string> this.dom.find('input[name="room-jid"]').val());
      let name = <string> this.dom.find('input[name="room-name"]').val() || undefined;
      let nickname = <string> this.nicknameInputElement.val() || this.defaultNickname;
      let password = <string> this.passwordInputElement.val() || undefined;
      let subject = <string> this.dom.find('input[name="room-subject"]').val() || undefined;

      let multiUserContact = new MultiUserContact(this.account, jid, name);
      multiUserContact.setNickname(nickname);
      multiUserContact.setBookmark(true);
      multiUserContact.setAutoJoin(true);
      multiUserContact.setPassword(password);
      multiUserContact.setSubject(subject);

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
