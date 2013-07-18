<?php

/*
local st = require "util.stanza";
local hmac_sha1 = require "util.hmac".sha1;
local base64 = require "util.encodings".base64;
local os_time = os.time;
local secret = module:get_option("turncredentials_secret") or false;
local host = module:get_option("turncredentials_host") or false -- use ip addresses here to avoid further dns lookup latency
local port = module:get_option("turncredentials_port") or 3478
if not (secret and host) then
    module:log("error", "turncredentials not configured");
    return;
end


module:hook("iq/host/urn:xmpp:extdisco:1:services", function(event)
    local origin, stanza = event.origin, event.stanza;
    if stanza.attr.type ~= "get" or stanza.tags[1].name ~= "services" or origin.type ~= "c2s" then
        return;
    end
    local now = os_time();
    local userpart = tostring(now);
    local nonce = base64.encode(hmac_sha1(secret, tostring(userpart), false));
    origin.send(st.reply(stanza):tag("services", {xmlns = "urn:xmpp:extdisco:1"})
        :tag("service", { type = "stun", host = host, port = port }):up()
        :tag("service", { type = "turn", host = host, port = port, username = userpart, password = nonce }):up()
    );
    return true;
end);
 */

$secret = 'test';
$host = 'localhost';
$port = 3478;

$now = time();
$userpart = $now;

$nonce = base64_encode( hash_hmac ( 'sha1' , $userpart, $secret, true ) );

echo $nonce;
?>
