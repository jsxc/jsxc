import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import { IContact } from '@src/Contact.interface';
import Client from '@src/Client';
import ChatWindow from '@ui/ChatWindow';

/**
 *
 * @version: 1.0.0
 *
 */

const SEARCH_CMD = '/search';
const MIN_VERSION = '4.3.0';
const MAX_VERSION = '99.0.0';

export default class ChatwindowSearchPlugin extends AbstractPlugin {
   private contact: IContact = undefined;
   private searchoff: JQuery<HTMLElement> = undefined;

   public static getId(): string {
      return 'cws';
   }

   public static getName(): string {
      return 'Chatwindow Search';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-cws-enable'),
         xeps: undefined,
      };
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);
      this.searchoff = $(
         '<div class="jsxc-message-search-off jsxc-message-search-off-icon" title="' +
            Translation.t('Clear_search') +
            '"></div>'
      );
      pluginAPI.registerCommand(SEARCH_CMD, this.commandHandler, Translation.t('cmd_search'));
   }

   private commandHandler = async (args: string[], contact: IContact, messageString: string) => {
      if (this.contact) {
         this.clearSearch();
      }

      this.contact = contact;
      if (!messageString || !messageString.startsWith(SEARCH_CMD)) {
         return true;
      }

      messageString = messageString.replace(/^\/search /, '').trim();

      if (messageString.length < 3) {
         return true;
      }

      let wnd: ChatWindow = Client.getChatWindowList().get(this.contact);
      let element = wnd.getDom();

      let messages = element.find('.jsxc-chatmessage');
      let iCaseInput = messageString.toLocaleLowerCase();
      let _self = this;
      for (let message of messages) {
         if ($(message).text().toLocaleLowerCase().indexOf(iCaseInput) === -1) {
            $(message).addClass('jsxc-search-negativeresult');
         } else {
            let content = $(message).find('.jsxc-content');
            if (content.find('.jsxc-attachment.jsxc-text').length > 0) {
               let text = this.replaceWithSpan(content.find('.jsxc-attachment.jsxc-text'), messageString);
               content.find('.jsxc-attachment.jsxc-text').html(text);
            }
            if (content.text().toLocaleLowerCase().indexOf(iCaseInput) >= 0) {
               if (content.children().length > 0) {
                  content.find('*').each(function () {
                     if ($(this).text().toLocaleLowerCase().indexOf(iCaseInput) >= 0) {
                        let text = _self.replaceWithSpan($(this), messageString);
                        $(this).html(text);
                     }
                  });

                  content
                     .contents()
                     .filter(function () {
                        return this.nodeType === 3;
                     })
                     .each(function () {
                        $(this).replaceWith(
                           content
                              .contents()
                              .last()[0]
                              .textContent.replace(
                                 messageString,
                                 '<span class="jsxc-search-positiveresult">' + messageString + '</span>'
                              )
                        );
                     });
               } else {
                  let text = _self.replaceWithSpan(content, messageString);
                  content.html(text);
               }
            }
         }
      }

      element.find('.jsxc-message-input').after(this.searchoff);
      this.searchoff.off('click').on('click', ev => {
         this.clearSearch(ev);
      });

      return true;
   };

   private replaceWithSpan(el: JQuery<HTMLElement>, replacetext: string): string {
      let cText = el[0].innerText; //jquery.text() removes line breaks
      let pattern = new RegExp('(' + replacetext.toLocaleLowerCase() + ')', 'gmi');
      let results = cText.match(pattern);
      let resultset = new Set(results);
      for (let replace of resultset) {
         cText = cText.replace(replace, '<span class="jsxc-search-positiveresult">' + replace + '</span>');
      }

      return cText;
   }

   private clearSearch(ev: any = undefined): void {
      if (ev) {
         ev.stopPropagation();
      }
      this.searchoff.remove();
      let wnd: ChatWindow = Client.getChatWindowList().get(this.contact);
      let element = wnd.getDom();
      element.find('.jsxc-search-negativeresult').removeClass('jsxc-search-negativeresult');
      element.find('.jsxc-search-positiveresult').each(function () {
         $(this)
            .parent()
            .html(
               $(this)
                  .parent()[0]
                  .innerText.replace(
                     /(?:(https?\:\/\/[^\s]+))/m,
                     '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
                  )
            );
      });
   }
}
