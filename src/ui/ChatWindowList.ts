import ChatWindow from './ChatWindow'
import Client from '../Client'

let chatWindowListTemplate = require('../../template/chatWindowList.hbs');

export default class ChatWindowList {
   private element;

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
      this.element = $(template);

      $('body').append(this.element);

      let storage = Client.getStorage();

      // $(window).resize(jsxc.gui.updateWindowListSB);
      // $('#jsxc_windowList').resize(jsxc.gui.updateWindowListSB);

      // $('#jsxc_windowListSB .jsxc_scrollLeft').click(function() {
      //    jsxc.gui.scrollWindowListBy(-200);
      // });
      // $('#jsxc_windowListSB .jsxc_scrollRight').click(function() {
      //    jsxc.gui.scrollWindowListBy(200);
      // });
      // $('#jsxc_windowList').on('wheel', function(ev) {
      //    if ($('#jsxc_windowList').data('isOver')) {
      //       jsxc.gui.scrollWindowListBy((ev.originalEvent.wheelDelta > 0) ? 200 : -200);
      //    }
      // });
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

         chatWindow.minimize();
      }
   }

   public add(chatWindow: ChatWindow) {
      let chatWindowIds = this.getChatWindowIds();

      if ($('body').hasClass('jsxc-fullscreen')) {
         this.minimizeAll();
      }

      if (chatWindowIds.indexOf(chatWindow.getId()) < 0) {
         this.windows[chatWindow.getId()] = chatWindow;

         this.element.find('> ul').append(chatWindow.getDom());
      } else {
         chatWindow = this.windows[chatWindow.getId()];
      }

      this.updateScrollbar();

      return chatWindow;
   }

   public remove(chatWindow: ChatWindow) {
      let chatWindowIds = this.getChatWindowIds();

      if (chatWindowIds.indexOf(chatWindow.getId()) > -1) {
         chatWindow.close();

         delete this.windows[chatWindow.getId()];
      }

      this.updateScrollbar();
   }

   private updateScrollbar() {

      if ($('#jsxc_windowList>ul').width() > $('#jsxc_windowList').width()) {
         $('#jsxc_windowListSB > div').removeClass('jsxc_disabled');
      } else {
         $('#jsxc_windowListSB > div').addClass('jsxc_disabled');
         $('#jsxc_windowList>ul').css('right', '0px');
      }
   }

   private scrollWindowListBy(offset) {

      let scrollWidth = $('#jsxc_windowList>ul').width();
      let width = $('#jsxc_windowList').width();
      let el = $('#jsxc_windowList>ul');
      let right = parseInt(el.css('right'), 10) - offset;
      let padding = $('#jsxc_windowListSB').width();

      if (scrollWidth < width) {
         return;
      }

      if (right > 0) {
         right = 0;
      }

      if (right < width - scrollWidth - padding) {
         right = width - scrollWidth - padding;
      }

      el.css('right', right + 'px');
   }

   private getChatWindowIds() {
      return Object.keys(this.windows || {});
   }
}
