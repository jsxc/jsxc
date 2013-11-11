/**
 * Copyright (c) 2013 Klaus Herberth <klaus@jsxc.org>
 * Released under the MIT license
 * 
 * @file MUC Plugin for the javascript xmpp client
 * @author Klaus Herberth
 * @version 0.3 
 */

jsxc.l10n.en.Join_chat = 'Join chat';
jsxc.l10n.de.Join_chat = 'Chat beitreten';
jsxc.l10n.en.Join = 'Join';
jsxc.l10n.de.Join = 'Beitreten';

jsxc.gui.template.joinChat = 
        '<h3>%%Join_chat%%</h3>\
         <p class=".jsxc_explanation">Blub</p>\
         <p><label for="jsxc_room">%%Room%%:</label>\
            <input type="text" name="room" id="jsxc_room" required="required" /></p>\
         <p><label for="jsxc_nickname">%%Nickname%%:</label>\
            <input type="text" name="nickname" id="jsxc_nickname" /></p>\
         <p><label for="jsxc_password">%%Password%%:</label>\
            <input type="text" name="password" id="jsxc_password" /></p>\
         <p class="jsxc_right">\
            <a href="#" class="button jsxc_close">%%Close%%</a> <a href="#" class="button creation jsxc_join">%%Join%%</a>\
         </p>';

(function($){
jsxc.muc = {
    conn: null,
            
    initMenu: function(){
        var li = $('<li>').attr('class', 'jsxc_joinChat').text(jsxc.translate('%%Join_chat%%'));
        li.click(jsxc.muc.showJoinChat);
        $('#jsxc_menu ul').append(li);
        
    },
    showJoinChat: function(){
        var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('joinChat'));
        
        dialog.find('.jsxc_join').click(function(){
            var room = $('#jsxc_room').val() || null;
            var nickname = $('#jsxc_nickname').val() || Strophe.getNodeFromJid(jsxc.xmpp.conn.jid);
            var password = $('#jsxc_password').val() || null;
            
            if(!room){
                $('#jsxc_room').addClass('jsxc_invalid').keyup(function() {
                    if ($(this).val())
                        $(this).removeClass('jsxc_invalid');
                });
                return false;
            }
            
            if(!room.match(/@(.*)$/))
                room += '@' + 'conference.localhost'; //@TODO: replace
            
            var cid = jsxc.jidToCid(room);
            
            if(jsxc.xmpp.conn.muc.roomNames.indexOf(room) < 0){
                jsxc.xmpp.conn.muc.join(room, nickname, null, null, null, password);
                
                jsxc.storage.setUserItem('roomNames', jsxc.xmpp.conn.muc.roomNames);
                
                var own = jsxc.storage.getUserItem('own') || [];
                own.push(jsxc.xmpp.conn.muc.test_append_nick(room, nickname))
                jsxc.storage.setUserItem('own', own);
                
                jsxc.storage.setUserItem('buddy_' + cid, {jid: room, name: room, type: 'groupchat'});
                
                var bl = jsxc.storage.getUserItem('buddylist');
                bl.push(cid);
                jsxc.storage.setUserItem('buddylist', bl);
                
                jsxc.gui.roster.add(cid);
            }
            
            jsxc.gui.window.open(cid);
            jsxc.gui.dialog.close();
        })
        
        dialog.find('input').keydown(function(ev) {
            if (ev.which !== 13)
                return;
            
            dialog.find('.jsxc_join').click();
        });
    },
    initWindow: function(event, win){
        var self = jsxc.muc;
        var data = win.data();
        var cid = jsxc.jidToCid(data.jid);
        var sdata = jsxc.storage.getUserItem('window_' + cid);     

        if (!jsxc.xmpp.conn) {
            $(document).one('connectionReady.jsxc', function() {
                self.initWindow(null, win);
            });
            return;
        }
    
        if (self.conn.muc.roomNames.indexOf(data.jid) < 0)
            return;
     
        win.addClass('jsxc_groupchat');
        win.find('.jsxc_tools > .jsxc_transfer').after('<div class="jsxc_members">M</div>');
        var ml = $('<div class="jsxc_memberlist"><ul></ul></div>');
        win.append(ml);
        
        ml.find('ul').slimScroll({
            height: '255px',
            distance: '3px'
        });
        
        var member = jsxc.storage.getUserItem('member_' + cid) || {};
        
        $.each(member, function(index, val){ 
            self.insertMember(cid, index, val.jid, val.status);
        });
        
        if(sdata.minimize_ml || sdata.minimize_ml === null)
            self.hideMemberList(win, 200, true);
        else
            setTimeout(function(){self.showMemberList(win, 200)}, 500);
        
        win.on('show', function(){ 
            ml.slideDown();
            ml.css('display', 'block');
        });
        win.on('hide', function(){ 
            ml.slideUp();
        });
        
        win.trigger((sdata.minimize)? 'hide' : 'show');
    },
    showMemberList: function(win, originalWidth, noani){
        if(!noani){
            win.animate({width: (originalWidth + 200) + 'px'}).css('overflow', 'visible');
        }
    
        jsxc.storage.updateUserItem('window_' + jsxc.jidToCid(win.data().jid), 'minimize_ml', false);
        
        win.find('.jsxc_members').off('click').one('click', function(){
            jsxc.muc.hideMemberList(win, originalWidth);
        });
    },
    hideMemberList: function(win, originalWidth, noani){
        if(!noani){
            win.animate({width: originalWidth + 'px'}).css('overflow', 'visible');
        }
        
        jsxc.storage.updateUserItem('window_' + jsxc.jidToCid(win.data().jid), 'minimize_ml', true);
        
        win.find('.jsxc_members').off('click').one('click', function(){
            jsxc.muc.showMemberList(win, originalWidth);
        });
    },
    onPresence: function(event, from, status, presence){ 
        var self = jsxc.muc; 
        var room = Strophe.getBareJidFromJid(from); 
        var cid = jsxc.jidToCid(room);
        var nickname = Strophe.getResourceFromJid(from);
        var xdata = $(presence).find('x[xmlns^="' + Strophe.NS.MUC + '"]');

        if(self.conn.muc.roomNames.indexOf(room) < 0 || xdata.length === 0)
            return;

        var jid = xdata.find('item').attr('jid');
       
        var member = jsxc.storage.getUserItem('member_' + cid) || {};
        if(status === 0){
            delete member[nickname];
            self.removeMember(cid, nickname);
            jsxc.gui.window.postMessage(cid, 'sys', nickname + ' left the building.')
        }else{
            if(!member[nickname])
                jsxc.gui.window.postMessage(cid, 'sys', nickname + ' entered the room.')
            member[nickname] = {jid: jid, status: status, roomJid: from};
            self.insertMember(cid, nickname, jid, status);
        }
        
        jsxc.storage.setUserItem('member_' + cid, member);
      
        return true;
    },
    insertMember: function(cid, nickname, jid, status){ 
        var win = jsxc.gui.getWindow(cid);
        var m = win.find('.jsxc_memberlist li[data-nickname="'+nickname+'"]');

        if(m.length == 0){
            m = $('<li title="'+jid+'">' + nickname + '</li>');
            m.attr('data-nickname', nickname);
            win.find('.jsxc_memberlist ul').append(m);
        }
        
        if(status !== null){ 
            m.removeClass('jsxc_' + jsxc.status.join(' jsxc_')).addClass('jsxc_' + jsxc.status[status]);
        }
    },
    removeMember: function(cid, nickname){
        var win = jsxc.gui.getWindow(cid);
        var m = win.find('.jsxc_memberlist li[data-nickname="'+nickname+'"]');

        if(m.length > 0){
            m.remove();
        }
    },
    onGroupchatMessage: function(message){
        var from = $(message).attr('from');
        var body = $(message).find('body:first').text();
        body = Strophe.getResourceFromJid(from) + ': ' + body;
        $(message).find('body:first').text(body);
        
        jsxc.xmpp.onMessage($(message)[0]);
        
        return true;
    },
    onNormalMessage: function(message){

        return true;
    }
};
var test;
$(document).one('ready.roster.jsxc', jsxc.muc.initMenu);
$(document).one('attached', function(){
    var self = jsxc.muc;
    self.conn = jsxc.xmpp.conn;
    self.conn.addHandler(self.onGroupchatMessage, null, 'message', 'groupchat');
    self.conn.addHandler(self.onNormalMessage, null, 'message', 'normal');
    self.conn.muc.roomNames = jsxc.storage.getUserItem('roomNames') || [];
});
$(document).one('connected', function(){
    jsxc.storage.removeUserItem('roomNames');
});
$(document).on('init.window.jsxc', jsxc.muc.initWindow);
$(document).on('presence.jsxc', jsxc.muc.onPresence);

$(function(){
    
});
})(jQuery);