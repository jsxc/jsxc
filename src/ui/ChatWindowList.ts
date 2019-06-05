import ChatWindow from './ChatWindow'

let chatWindowListTemplate = require('../../template/chatWindowList.hbs');

const SCROLL_REFRESH = 500;
const SCROLL_OFFSET = 200;

export default class ChatWindowList {
   private element: JQuery;

   private listElement: JQuery;

   private elementWidth: number;

   private listWidth: number;

   private windows: any = {};

   private static instance: ChatWindowList;

   public static init(): void {
      ChatWindowList.get();
   }

   public static get(): ChatWindowList {
      if (!ChatWindowList.instance) {
         ChatWindowList.instance = new ChatWindowList();
      }

      return ChatWindowList.instance;
   }

   private constructor() {
      let template = chatWindowListTemplate();
      $('body').append(template);

      this.element = $('#jsxc-window-list');
      this.listElement = this.element.find('>ul');

      setInterval(() => this.updateScrollbar(), SCROLL_REFRESH);

      $('#jsxc-window-list-handler .jsxc-scrollLeft').click(() => {
         this.scrollWindowListBy(-1 * SCROLL_OFFSET);
      });
      $('#jsxc-window-list-handler .jsxc-scrollRight').click(() => {
         this.scrollWindowListBy(SCROLL_OFFSET);
      });
   }

   public closeAll() {
      for (let chatWindowId in this.windows) {
         let chatWindow: ChatWindow = this.windows[chatWindowId];

         chatWindow.close();
      }
   }

   public minimizeAll() {
      for (let chatWindowId in this.windows) {
         let chatWindow: ChatWindow = this.windows[chatWindowId];

         chatWindow.getContact().getChatWindowController().minimize();
      }
   }

   public add(chatWindow: ChatWindow) {
      let chatWindowIds = this.getChatWindowIds();

      if (chatWindowIds.indexOf(chatWindow.getId()) < 0) {
         this.windows[chatWindow.getId()] = chatWindow;

         this.listElement.append(chatWindow.getDom());
      } else {
         chatWindow = this.windows[chatWindow.getId()];
      }

      return chatWindow;
   }

   public remove(chatWindow: ChatWindow) {
      let chatWindowIds = this.getChatWindowIds();

      if (chatWindowIds.indexOf(chatWindow.getId()) > -1) {
         chatWindow.close();

         delete this.windows[chatWindow.getId()];
      }
   }

   public moveIntoViewport(chatWindow: ChatWindow) {
      let padding = $('#jsxc-window-list-handler').width() || 0;
      let scrollWidth = this.listElement.width() - padding;
      let width = this.element.width() - padding;

      if (scrollWidth <= width) {
         return;
      }

      let offset = parseInt(this.listElement.css('right'), 10);
      let windowElement = chatWindow.getDom();
      let windowWidth = windowElement.outerWidth();
      let positionLeft = windowElement.position().left - padding;

      let right = - offset - scrollWidth + positionLeft + windowWidth;
      let left = scrollWidth - width + offset - positionLeft;

      if (left > 0) {
         this.scrollWindowListBy(left);
      }

      if (right > 0) {
         this.scrollWindowListBy(-right);
      }
   }

   private updateScrollbar() {
      let padding = $('#jsxc-window-list-handler').width() || 0;
      let elementWidth = this.element.width() - padding;
      let listWidth = this.listElement.width();

      if (this.elementWidth === elementWidth && this.listWidth === listWidth) {
         return;
      }

      this.elementWidth = elementWidth;
      this.listWidth = listWidth;

      if (listWidth > elementWidth) {
         $('#jsxc-window-list-handler > div').removeClass('jsxc-disabled');
      } else {
         $('#jsxc-window-list-handler > div').addClass('jsxc-disabled');

         this.listElement.css('right', '0px');
      }
   }

   private scrollWindowListBy(offset: number) {
      let scrollWidth = this.listElement.width();
      let width = this.element.width();
      let right = parseInt(this.listElement.css('right'), 10) - offset;
      let padding = $('#jsxc-window-list-handler').width() || 0;

      if (scrollWidth < width) {
         return;
      }

      if (right > 0) {
         right = 0;
      }

      if (right < width - scrollWidth - padding) {
         right = width - scrollWidth - padding;
      }

      this.listElement.css('right', right + 'px');
   }

   private getChatWindowIds() {
      return Object.keys(this.windows || {});
   }
}
