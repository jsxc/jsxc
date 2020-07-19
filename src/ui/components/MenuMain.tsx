import React, { useState, useEffect } from 'react';
import Menu from './Menu';
import { IMenuItem } from '../../Menu';
import Client from '../../Client';
import MenuItem from './MenuItem';

type Props = {

}

const MenuMain: React.FC<Props> = () => {
    const [items, setItems] = useState<IMenuItem[]>([]);

    useEffect(() => {
        Client.getMainMenu().registerMenuItemHandler(items => setItems(items));
    }, []);

    return (
        <Menu direction='pushup' classes={{button: 'jsxc-icon jsxc-icon--menu-dark jsxc-icon--clickable'}}>
            {items.map((item, i) => <MenuItem key={i} item={item} />)}
        </Menu>
    )
}

export default MenuMain;
