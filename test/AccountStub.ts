import JID from '../src/JID'

export default class Account {

    public getJID(): JID {
        return new JID('foo@bar')
    }

    public getContact() {
        return {
            setStatus: (status) => { },
            setPresence: (resource, status) => { },
            setResource: (resource) => { }
        }
    }

    public getConnection() {
        return {
            sendSubscriptionAnswer: (jid, response) => { }
        }
    }
}
