import Templates from "../util/Templates";
import ChatWindow from "./ChatWindow"
import Client from "../Client"

let chatWindowListTemplate = require('../../template/chatWindowList.hbs');

export default class ChatWindowList {
   private element;

   private chatWindowList: any = {};

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
      for (let chatWindowId in this.chatWindowList) {
         let chatWindow: ChatWindow = this.chatWindowList[chatWindowId];

         chatWindow.close();
      }
   }

   public minimizeAll() {
      for (let chatWindowId in this.chatWindowList) {
         let chatWindow: ChatWindow = this.chatWindowList[chatWindowId];

         chatWindow.minimize();
      }
   }

   public add(chatWindow: ChatWindow) {
      console.log('add', chatWindow)
      let chatWindowIds = this.getChatWindowIds();

      if (chatWindowIds.indexOf(chatWindow.getId()) < 0) {
         this.chatWindowList[chatWindow.getId()] = chatWindow;

         // chatWindow.unminimize();

         this.element.find('> ul').append(chatWindow.getDom());
      } else {
         chatWindow = this.chatWindowList[chatWindow.getId()];
      }

      this.updateWindowListSB();

      return chatWindow;
   }

   public remove(chatWindow: ChatWindow) {
      let chatWindowIds = this.getChatWindowIds();

      if (chatWindowIds.indexOf(chatWindow.getId()) > -1) {
         chatWindow.close();

         delete this.chatWindowList[chatWindow.getId()];
      }

      this.updateWindowListSB();
   }

   private updateWindowListSB() {

      if ($('#jsxc_windowList>ul').width() > $('#jsxc_windowList').width()) {
         $('#jsxc_windowListSB > div').removeClass('jsxc_disabled');
      } else {
         $('#jsxc_windowListSB > div').addClass('jsxc_disabled');
         $('#jsxc_windowList>ul').css('right', '0px');
      }
   }

   private scrollWindowListBy(offset) {

      var scrollWidth = $('#jsxc_windowList>ul').width();
      var width = $('#jsxc_windowList').width();
      var el = $('#jsxc_windowList>ul');
      var right = parseInt(el.css('right')) - offset;
      var padding = $("#jsxc_windowListSB").width();

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
      return Object.keys(this.chatWindowList || {});
   }
}
