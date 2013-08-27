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
        
        <label for="iceUrl">ICE Url</label> 
        <input type="text" name="iceUrl" id="iceUrl" value="<?php p($_['iceUrl']); ?>" />
        <br />
        
        <label for="iceUsername">ICE Username</label> 
        <input type="text" name="iceUsername" id="iceUrl" value="<?php p($_['iceUsername']); ?>" />
        <br />
        
        <label for="iceCredential">ICE Credential</label> 
        <input type="text" name="iceCredential" id="iceCredential" value="<?php p($_['iceCredential']); ?>" />
        <br />
        
        <span class="msg"></span>
        <br />
        
        <input type="submit" value="Save" />
    </fieldset>
</form>