import Client from '../Client'
import OTRPlugin from '../plugins/otr/Plugin'
import ReceiptPlugin from '../plugins/receipts'
import NotificationPlugin from '../plugins/Notification'
import MeCommandPlugin from '../plugins/MeCommand'
import MessageArchiveManagementPlugin from '../plugins/mam/Plugin'
import ChatStatePlugin from '../plugins/chatState/ChatStatePlugin'
import HttpUploadPlugin from '../plugins/httpUpload/HttpUploadPlugin'
import AvatarVCardPlugin from '../plugins/AvatarVCardPlugin'
import CarbonsPlugin from '../plugins/Carbons'
import OMEMOPlugin from '../plugins/omemo/Plugin'

Client.addPlugin(OTRPlugin);
Client.addPlugin(OMEMOPlugin);
Client.addPlugin(ReceiptPlugin);
Client.addPlugin(NotificationPlugin);
Client.addPlugin(MeCommandPlugin);
Client.addPlugin(MessageArchiveManagementPlugin);
Client.addPlugin(ChatStatePlugin);
Client.addPlugin(HttpUploadPlugin);
Client.addPlugin(AvatarVCardPlugin);
Client.addPlugin(CarbonsPlugin);
