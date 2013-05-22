
function toggleRoster(d) {
    var roster = $('#jsxc_roster');
    var wrapper = $('#content-wrapper');
    var control = $('#controls');
    var wl = $('#jsxc_windowList > ul');
    
    var duration = d || 500;
    
    var roster_width = roster.outerWidth();
    var navigation_width = $('#navigation').width();

    if (roster.css('right') == '0px') {
        jsxc.storage.setItem('roster', 'hidden');
        
        roster.animate({right: '-200px'}, duration);
        wrapper.animate({paddingRight: '0px'}, duration);
        control.animate({paddingRight: navigation_width}, duration);
        wl.animate({paddingRight: '10px'}, duration);
    } else {
        jsxc.storage.setItem('roster', 'shown');
        
        roster.animate({right: '0px'}, duration);
        wrapper.animate({paddingRight: '200px'}, duration);
        control.animate({paddingRight: roster_width + navigation_width}, duration);
        wl.animate({paddingRight: '210px'}, duration);
    }
}

//initialization
$(function() {

    jsxc.init({
        loginForm: {
            form: '#body-login form',
            jid: '#user',
            pass: '#password',
            preJid: function(jid) {
                var data;

                $.ajax(OC.filePath('ojsxc', 'ajax', 'getsettings.php'), {
                    async: false,
                    success: function(d) {
                        data = d;
                    }
                });

                var resource = (data.xmppResource) ? '/' + data.xmppResource : '';
                var domain = data.xmppDomain;

                jsxc.storage.setItem('boshUrl', data.boshUrl);

                if (jid.match(/@(.*)$/))
                    return (jid.match(/\/(.*)$/)) ? jid : jid + resource;
                else
                    return jid + '@' + domain + resource;
            }
        },
        logoutElement: $('#logout'),
        checkFlash: false,
        debug: function(msg) {
            console.log(msg);
        },
        rosterAppend: 'body'
    });
    
    if(jsxc.el_exists($('#body-login form'))){
        var form = $('#body-login form');
        
        var link = $('<a/>').text('Log in without chat').click(function(){
            jsxc.submitLoginForm();
        });
        var alt = $('<p id="jsxc_alt"/>').append(link);
        $('#body-login form fieldset').append(alt);
    }

    $(document).on('ready.roster.jsxc', function() {
        
        window.addEventListener('storage', function(e){
            if(e.key === 'jsxc_roster')
                toggleRoster();
        }, false);
        
        if(jsxc.storage.getItem('roster') == 'hidden'){
            toggleRoster(0.00001);
            return;
        }
        
        var normal = {
            width:12,
            height:'100%',
            position: 'absolute',
            left:-12,
            top:0,
            zIndex: 110,
            backgroundColor: 'transparent',
            cursor: 'pointer'
        };
        var hover = {
            backgroundColor: '#a4a4a4',
            opacity:0.5
        };
        var bar = $('<div id="jsxc_toggleRoster"/>')
                .css(normal)
                .click(toggleRoster)
                .hover(
                    function(){
                        $(this).css(hover);
                    },function(){
                        $(this).css(normal);
                    });
        
        $('#jsxc_roster').append(bar);
        
        var roster_width = $('#jsxc_roster').outerWidth();
        var navigation_width = $('#navigation').width();

        $('#content-wrapper').css('paddingRight', roster_width);
        $('#controls').css('paddingRight', roster_width + navigation_width);
    });
}); 