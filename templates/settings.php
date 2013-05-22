<form id="ojsxc">
    <fieldset class="personalblock">
        <strong>oJSXC</strong><br />
        
        <label for="boshUrl">BOSH url</label> 
        <input type="text" name="boshUrl" id="boshUrl" value="<?php p($_['boshUrl']); ?>" />
        <br />
        
        <label for="xmppDomain">XMPP domain</label> 
        <input type="text" name="xmppDomain" id="xmppDomain" value="<?php p($_['xmppDomain']); ?>" />
        <br />
        
        <label for="xmppResource">XMPP resource</label> 
        <input type="text" name="xmppResource" id="xmppResource" value="<?php p($_['xmppResource']); ?>" />
        <br />
        
        <span class="msg"></span>
        <br />
        
        <input type="submit" value="Save" />
    </fieldset>
</form>