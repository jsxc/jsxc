import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import MenuPresence from './components/MenuPresence';
import MenuMain from './components/MenuMain';
import Client from '@src/Client';
import { IContact } from '@src/Contact.interface';
import RosterItem from './components/RosterItem';

type Props = {

}

const Roster: React.FC<Props> = () => {
    const [contacts, setContacts] = useState<IContact[]>([]);

    useEffect(() => {
        Client.getRoster().registerHook(contacts => setContacts(contacts));
    }, []);

    return (
        <div id='jsxc-roster'>
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
            <div onClick={() => Client.getRoster().toggle()} className='jsxc-roster-toggle'></div>
        </div >
    );
}

const container = document.createElement('div');
container.setAttribute('id', 'jsxc-container');
document.getElementsByTagName('body')[0].appendChild(container);

const renderer = ReactDOM.render(
    <Roster />,
    container
);

export default renderer;
