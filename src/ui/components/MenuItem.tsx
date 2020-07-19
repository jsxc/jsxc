import React from 'react';
import { IMenuItem } from '../../Menu';

type Props = {
    item: IMenuItem,
}

const MenuItem: React.FC<Props> = ({ item }) => {
    const classNames = (typeof item.classNames === 'string') ? item.classNames : item.classNames?.join(' ');

    return (
        <li onClick={item.handler} className={classNames}>{item.label}</li>
    )
}

export default MenuItem;
