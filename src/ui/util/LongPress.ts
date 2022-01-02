const onLongPress = (element: JQuery<HTMLElement>, handler: () => void): void => {
   const duration = 1000;

   let durationTimeout: number;
   let isLongPress: boolean;

   element.on('mousedown', ev => {
      isLongPress = false;

      durationTimeout = window.setTimeout(() => {
         ev.stopPropagation();
         ev.preventDefault();

         isLongPress = true;

         handler();
      }, duration);
   });

   element.on('mouseup', () => {
      window.clearTimeout(durationTimeout);
   });

   element.on('click', ev => {
      if (isLongPress) {
         ev.stopPropagation();
         ev.preventDefault();
      }
   });
};

export default onLongPress;
