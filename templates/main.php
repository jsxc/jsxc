<div id="jsxc">
    <h1>JavaScript XMPP Chat</h1>

    <p id="jsxc_statusinfo">Checking...</p>

    <script type="text/javascript">
        $(function(){
            window.setInterval(function(){
                var status = $('#jsxc_statusinfo');

                if(jsxc.xmpp.conn){
                    status.html('You are connected.<br /><a href="#" onclick="jsxc.xmpp.logout()">Logout</a>');
                } else {
                    status.html('You are not connected. Please <a href="javascript:jsxc.gui.showLoginBox()">login</a>.');
                }
            }, 1000);
        });
    </script>
</div>