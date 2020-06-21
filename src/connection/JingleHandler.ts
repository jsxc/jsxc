import { IConnection } from './Connection.interface'
import Account from '../Account'
import * as JSM from 'jingle'
import { createRegistry } from 'jxt'
import Log from '../util/Log'
import UUID from '../util/UUID'
import JID from '@src/JID';
import { IJID } from '../JID.interface'
import { VideoDialog } from '../ui/VideoDialog'
import JingleSession from '../JingleSession'
import JingleAbstractSession from '../JingleAbstractSession'
import JingleMediaSession from '@src/JingleMediaSession';
import { IOTalkJingleMediaSession } from '@vendor/Jingle.interface';
import IceServers, { ICEServer } from '@src/IceServers';
import Client from '@src/Client';

let jxt = createRegistry();
jxt.use(require('jxt-xmpp-types'));
jxt.use(require('jxt-xmpp'));

let IqStanza = jxt.getDefinition('iq', 'jabber:client');

interface IOfferOptions {
   offerToReceiveAudio?: boolean
   offerToReceiveVideo?: boolean
}

export default class JingleHandler {

   protected manager: JSM;

   protected static videoDialog: VideoDialog;

   protected static instances: JingleHandler[] = [];

   constructor(protected account: Account, protected connection: IConnection) {
      this.manager = new JSM({
         // peerConnectionConstraints: this.getPeerConstraints(),
         jid: connection.getJID().full,
         selfID: connection.getJID().full,
         iceServers: Client.getOption('RTCPeerConfig').iceServers
      });

      this.manager.on('change:connectionState', function() {
         Log.info('change:connectionState', arguments);
      })

      this.manager.on('log:*', function(level, msg) {
         Log.debug('[JINGLE][' + level + ']', msg);
      });

      this.manager.on('send', (data) => {
         let iq = new IqStanza(data);
         let iqElement = $.parseXML(iq.toString()).getElementsByTagName('iq')[0];

         iqElement.querySelectorAll('payload-type[name="telephone-event"]').forEach(el => el.remove());

         if (!iqElement.getAttribute('id')) {
            iqElement.setAttribute('id', UUID.v4() + ':sendIQ');
         }

         (<any> this.connection).send(iqElement); //@REVIEW
      });

      this.manager.on('incoming', (session) => {
         this.onIncoming(session);
      });

      IceServers.registerUpdateHook((iceServers) => {
         this.setICEServers(iceServers);
      });

      JingleHandler.instances.push(this);
   }

   public async initiate(peerJID: IJID, stream: MediaStream, offerOptions?: IOfferOptions): Promise<JingleMediaSession> {
      let iceServers = await IceServers.get();
      this.setICEServers(iceServers);

      let session: IOTalkJingleMediaSession = this.manager.createMediaSession(peerJID.full, undefined, stream);

      return new Promise<JingleMediaSession>(resolve => {
         session.start(offerOptions, () => {
            let jingleSession = JingleSession.create(this.account, session);

            resolve(jingleSession);
         });
      });
   }

   public terminate(jid: IJID, reason?: string, silent?: boolean);
   public terminate(reason?: string, silent?: boolean);
   public terminate() {
      if (arguments[0] instanceof JID) {
         this.manager.endPeerSessions(arguments[0].full, arguments[1], arguments[2]);
      } else {
         this.manager.endAllSessions(arguments[0], arguments[1]);
      }
   }

   public addICEServer(server: ICEServer | string) {
      this.manager.addICEServer(server);
   }

   public setICEServers(servers: ICEServer[]) {
      this.manager.iceServers = servers;
   }

   public setPeerConstraints(constraints) {
      this.manager.config.peerConnectionConstraints = constraints;
   }

   public onJingle = (iq: Element) => {
      let req;

      try {
         req = jxt.parse(iq.outerHTML);
      } catch (err) {
         Log.error('Error while parsing jingle: ', err);

         return;
      }

      this.manager.process(req.toJSON());

      return true;
   }

   protected onIncoming(session: IOTalkJingleMediaSession): JingleAbstractSession {
      return JingleSession.create(this.account, session);
   }

   // private onIncomingFileTransfer(session: IOTalkJingleMediaSession) {
   //    Log.debug('incoming file transfer from ' + session.peerID);

   //    let peerJID = new JID(session.peerID);
   //    let contact = this.account.getContact(peerJID);

   //    if (!contact) {
   //       Log.warn('Reject file transfer, because the contact is not in your contact list');

   //       return;
   //    }

   //    session.accept();

   //    // let chatWindow = contact.getChatWindow();

   //    // let message = new Message({
   //    //    peer: contact.getJid(),
   //    //    direction: Message.DIRECTION.IN,
   //    //    attachment: new Attachment({
   //    //       name: session.receiver.metadata.name,
   //    //       type: session.receiver.metadata.type || 'application/octet-stream'
   //    //    })
   //    // });
   //    // message.save();

   //    // chatWindow.receiveIncomingMessage(message);
   //    //
   //    // session.receiver.on('progress', function(sent, size) {
   //    //    message.updateProgress(sent, size);
   //    // });
   // }

   public static terminateAll(reason?: string) {
      JingleHandler.instances.forEach((instance) => {
         instance.terminate(reason);
      });
   }

   public static getVideoDialog(): VideoDialog {
      if (!JingleHandler.videoDialog || !JingleHandler.videoDialog.isReady()) {
         JingleHandler.videoDialog = new VideoDialog();
      }

      return JingleHandler.videoDialog;
   }
}
