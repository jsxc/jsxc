import React from 'react';

type Props = {
    classes?: {
        root?: string,
        button?: string,
    },
    label?: string,
    direction?: 'pushup' | 'drop-top-right' | 'drop-bottom-left' | 'drop-bottom-right' | 'drop-right-top' | 'vertical-left',
    grow?: boolean,
}

const Menu: React.FC<Props> = ({ classes, label, children, direction, grow } = { classes: {}, label: '', direction: 'drop-top-right' }) => {
   return (
       <div className={`jsxc-menu jsxc-menu--${direction} ${grow && 'jsxc-grow'} ${classes?.root}`}>
           <div className={`jsxc-menu__button ${classes?.button}`}>{label}</div>
           <div className='jsxc-menu__content'>
               <ul>
                   {children}
               </ul>
           </div>
       </div>
   )
}

export default Menu;
