import React, { useEffect, useState } from 'react';
import { IContact } from '../../Contact.interface';
import Menu from './Menu';

type Props = {
    contact: IContact,
}

const RosterItemMenu = () => {
    /* {{ #> menu classes="jsxc-bar__action-entry jsxc-menu--vertical-left jsxc-menu--light" button- classes="jsxc-icon jsxc-icon--more-dark jsxc-icon--clickable"}}
            <li class="jsxc-rename" title="{{t " rename_buddy"}}"><span class="jsxc-icon jsxc-icon--edit"></span></li>
        <li class="jsxc-vcard" title="{{t " get_info"}}" > <span class="jsxc-icon jsxc-icon--info"></span></li >
            <li class="jsxc-delete" title="{{t " delete_buddy"}}" > <span class="jsxc-icon jsxc-icon--delete"></span></li >
                {{ /menu}} */

    return (
        <Menu>

        </Menu>
    );
}

const RosterItem: React.FC<Props> = ({ contact }) => {
    const [name, setName] = useState<string>(contact.getName());
    const [status] = useState<string>(contact.getStatus())

    useEffect(() => {
        contact.registerHook('name', (name) => {
            setName(name);
        });
    });

    return (
        <li className='jsxc-roster-item jsxc-bar' draggable={true}>
            <div className='jsxc-avatar jsxc-shrink--no'></div>

            <div className='jsxc-bar__caption jsxc-grow'>
                <div title='{{jid}}' className='jsxc-bar__caption__primary'>{name}</div>
                <div title='{{lastMessage}}' className='jsxc-bar__caption__secondary'>{status}</div>
            </div>

            <RosterItemMenu />
        </li>
    )
}

export default RosterItem;
