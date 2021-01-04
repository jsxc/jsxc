import SelectionDialog from './selection';
import Translation from '@util/Translation';

export default function(accountId: string, header: string, description: string, fromString: string) {
   SelectionDialog({
      header,
      message: description,
      option: {
         cb: () => undefined,
         label: Translation.t('Close'),
      }
   });
}
