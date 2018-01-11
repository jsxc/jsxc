import JID from '../src/JID'
import Account from './AccountStub'
import { IPlugin as PluginInterface } from '../src/plugin/AbstractPlugin'

export default class Client {
    private static account = new Account();

    public static init() { }

    public static addConnectionPlugin(plugin: PluginInterface) { }

    public static addPreSendMessageHook(hook: (Message, Builder) => void, position?: number) { }

    public static hasFocus() { }

    public static isExtraSmallDevice(): boolean {
        return false;
    }

    public static isDebugMode(): boolean {
        return false;
    }

    public static getStorage() { }

    public static getAccout(jid: JID): Account;
    public static getAccout(uid?: string): Account;
    public static getAccout(): Account {
        return Client.account;
    }

    public static createAccount(boshUrl: string, jid: string, sid: string, rid: string);
    public static createAccount(boshUrl: string, jid: string, password: string);
    public static createAccount() {

    }

    public static removeAccount(account: Account) {

    }
}
