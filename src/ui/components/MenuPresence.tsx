import React, { useState, useEffect } from 'react';
import Menu from './Menu';
import { IMenuItem } from '../../Menu';
import Client from '../../Client';
import MenuItem from './MenuItem';

type Props = {

}

const MenuPresence: React.FC<Props> = () => {
    const [items, setItems] = useState<IMenuItem[]>([]);

    useEffect(() => {
        Client.getPresenceMenu().registerMenuItemHandler((items) => setItems(items));
    }, []);

    return (
        <Menu grow={true} direction='pushup'>
            {items.map((item, i) => <MenuItem key={i} item={item} />)}
        </Menu>
    )
}

export default MenuPresence;
