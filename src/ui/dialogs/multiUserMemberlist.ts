import Dialog from '../Dialog';
import MultiUserContact from '../../MultiUserContact';
import { REGEX } from '@src/CONST';
import { MultiUserAffiliation } from '@connection/services/MUC';
import { IJID } from '@src/JID.interface';
import JID from '@src/JID';

let multiUserMemberlist = require('../../../template/multiUserMemberlist.hbs');

export default function (multiUserContact: MultiUserContact) {
   let content = multiUserMemberlist({});

   let dialog = new Dialog(content);

   let service = multiUserContact.getAccount().getConnection().getMUCService();
   let dom = dialog.open();

   dom.find('form').on('submit', ev => {
      ev.preventDefault();

      let lines = $(ev.target)
         .find('textarea')
         .val()
         .toString()
         .split('\n')
         .map(line => line.trim());

      let oldMemberList = $(ev.target)
         .find('[type="hidden"]')
         .val()
         .toString()
         .split('\n')
         .filter(line => !!line);
      let newMemberList = lines.filter(
         (line, index, arr) => line && index === arr.indexOf(line) && REGEX.JID.test(line)
      );

      let deltaList: { jid: IJID; affiliation: MultiUserAffiliation }[] = [];

      let removedJids: string[] = <any>$(oldMemberList)
         .not(newMemberList as any)
         .get();
      let addedJids: string[] = <any>$(newMemberList)
         .not(oldMemberList as any)
         .get();

      removedJids.forEach(jidString => {
         deltaList.push({
            jid: new JID(jidString),
            affiliation: 'none',
         });
      });

      addedJids.forEach(jidString => {
         deltaList.push({
            jid: new JID(jidString),
            affiliation: 'member',
         });
      });

      dom.find('button, textarea').prop('disabled', true);

      if (deltaList.length === 0) {
         dialog.close();
         return;
      }

      service.setMemberList(multiUserContact.getJid(), deltaList).then(function () {
         dialog.close();
      });
   });

   service.getMemberList(multiUserContact.getJid()).then(function (stanza) {
      let memberList = $(stanza)
         .find('item')
         .map((_, item) => $(item).attr('jid'))
         .get();

      dom.find('textarea, [type="hidden"]').val(memberList.join('\n'));
   });
}
