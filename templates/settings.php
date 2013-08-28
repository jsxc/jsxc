<form id="ojsxc">
    <fieldset class="personalblock">
        <strong>oJSXC</strong><br />

        <table style="width:auto">
            <tr>
                <td>
                    <label for="boshUrl">BOSH url</label>
                </td>
                <td> 
                    <input type="text" name="boshUrl" id="boshUrl" value="<?php p($_['boshUrl']); ?>" />
                </td>
                <td>
                </td>
            </tr>
            <tr>
                <td>

                    <label for="xmppDomain">XMPP domain</label>
                </td>
                <td> 
                    <input type="text" name="xmppDomain" id="xmppDomain" value="<?php p($_['xmppDomain']); ?>" />
                </td>
                <td>
                </td>
            </tr>
            <tr>
                <td>

                    <label for="xmppResource">XMPP resource</label></td><td> 
                    <input type="text" name="xmppResource" id="xmppResource" value="<?php p($_['xmppResource']); ?>" /></td><td>
                </td></tr><tr><td>

                    <label for="iceUrl">TURN Url</label></td><td> 
                    <input type="text" name="iceUrl" id="iceUrl" value="<?php p($_['iceUrl']); ?>" /></td><td>
                </td></tr><tr><td>

                    <label for="iceUsername">TURN Username</label></td><td> 
                    <input type="text" name="iceUsername" id="iceUrl" value="<?php p($_['iceUsername']); ?>" /></td><td>
                    <em>If no username is set, short-term credentials are used.</em>
                </td></tr><tr><td>

                    <label for="iceCredential">TURN Credential</label></td><td> 
                    <input type="text" name="iceCredential" id="iceCredential" value="<?php p($_['iceCredential']); ?>" /></td>
                <td>
                    <em>If no password is set, short-term credentials are used.</em>
                </td></tr><tr><td>

                    <label for="iceSecret">TURN Secret</label></td><td> 
                    <input type="text" name="iceSecret" id="iceSecret" value="<?php p($_['iceSecret']); ?>" /></td><td>
                    <em>Secret for short-term credentials as described <a href="http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00" target="_blank">here</a>.</em>
                </td></tr><tr><td>

                    <label for="iceTtl">TURN TTL</label></td><td> 
                    <input type="text" name="iceTtl" id="iceTtl" value="<?php p($_['iceTtl']); ?>" /></td><td>
                    <em>Lifetime for short-term credentials in seconds.</em>
                </td></tr>
        </table>

        <span class="msg"></span>
        <br />

        <input type="submit" value="Save" />
    </fieldset>
</form>