
function onRosterToggle(event, state, duration){
    var wrapper = $('#content-wrapper');
    var control = $('#controls');
    
    var roster_width = (state == 'shown')? $('#jsxc_roster').outerWidth() : 0;
    var navigation_width = $('#navigation').width();
       
    wrapper.animate({paddingRight: (roster_width) + 'px'}, duration);
    control.animate({paddingRight: (roster_width + navigation_width) + 'px'}, duration);
}

function onRosterReady() {

    var roster_width = $('#jsxc_roster').outerWidth();
    var navigation_width = $('#navigation').width();
    var roster_right = parseFloat($('#jsxc_roster').css('right'));

    $('#content-wrapper').css('paddingRight', roster_width + roster_right);
    $('#controls').css('paddingRight', roster_width + navigation_width + roster_right);
}

//initialization
$(function() {

    $(document).on('ready.roster.jsxc', onRosterReady);
    $(document).on('toggle.roster.jsxc', onRosterToggle);

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
        rosterAppend: 'body',
        root: oc_appswebroots.ojsxc,
        turnCredentialsPath: OC.filePath('ojsxc', 'ajax', 'getturncredentials.php'),
    });


    //Add submit link without chat functionality
    if (jsxc.el_exists($('#body-login form'))) {

        var link = $('<a/>').text('Log in without chat').click(function() {
            jsxc.submitLoginForm();
        });
        
        var alt = $('<p id="jsxc_alt"/>').append(link);
        $('#body-login form fieldset').append(alt);
    }
}); 