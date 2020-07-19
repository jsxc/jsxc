import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import MenuPresence from './components/MenuPresence';
import MenuMain from './components/MenuMain';
import Client from '@src/Client';
import * as CONST from '../CONST'
import { IContact } from '@src/Contact.interface';
import RosterItem from './components/RosterItem';

type Props = {

}

const VISIBILITY_KEY = 'rosterVisibility';

const toggle = () => {
    let state = Client.getOption(VISIBILITY_KEY);

    state = (state === CONST.HIDDEN) ? CONST.SHOWN : CONST.HIDDEN;

    Client.setOption(VISIBILITY_KEY, state);
};

const Roster: React.FC<Props> = () => {
    const [contacts, setContacts] = useState<IContact[]>([]);

    useEffect(() => {
        Client.getAccountManager().registerAddedAccountHook(accountId => {
            let account = Client.getAccountManager().getAccount(accountId);

            account.getContactManager().registerNewContactHook(contact => {
                if (contacts.indexOf(contact) > -1) {
                    return;
                }

                setContacts([...contacts, contact]);
            });
        })
    });

    return (
        <div id='jsxc-roster2'>
            <div className='jsxc-contact-list-wrapper'>
                <ul className='jsxc-contact-list'>
                    {contacts.map(contact => <RosterItem key={contact.getUid()} contact={contact} />)}
                </ul>
            </div>
            <div className='jsxc-roster-status'></div>
            <div className='jsxc-bottom jsxc-presence jsxc-roster-item jsxc-bar' data-bid='own'>
                <div className='jsxc-avatar jsxc-shrink--no'></div>

                <MenuPresence />

                <MenuMain />
            </div>
            <div onClick={toggle} className='jsxc-roster-toggle'></div>
        </div >
    )
}

const renderer = ReactDOM.render(
    <Roster />,
    document.getElementsByTagName('body')[0]
);

export default renderer;
