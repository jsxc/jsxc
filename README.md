# Owncloud JavaScript Xmpp Client

__Beware! This is a beta software.__

## General

_TODO insert short description_

### Features
- integration into existing ui
- one-to-one conversation (XMPP)
- encrypted one-to-one conversation (OTR)
.- use of whitespace tags to start a OTR session
- user verification (SMP)
- encrypted one-to-one video call (WebRTC)
.- [TURN REST API](http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00)
.- fullscreen mode
.- snapshots
- auto link-detection
- emotions
- roster management 
- multi-language support (de, en)
- multi tab support

### Supported protocols
- XMPP Core (RFC6120)
- XMPP IM (RFC6121)
- Bidirectional-streams Over Synchronous HTTP (XEP-0124)
- XMPP Over BOSH (XEP-0206)
- Service Discovery (XEP-0030)
- CAP (XEP-0127)
- Jingle (XEP-0166)
- Jingle RTP Sessions (XEP-0167)

### Supported browsers
- Full support for __Chrome__ and __Firefox__.
- __IE__ doesn't support multi tabs, WebRTC and Notifications.
- __Safari__ doesn't support WebRTC and Notifications.

### Planned features
- multi user chat
- video conference
- encrypted file transfer 

## User notes

Please download the latest version from https://github.com/sualko/ojsxc/releases and copy the "build" folder to your app directory and rename it to "ojsxc". Now go into your app menu and enable the "JavaScript Xmpp Chat".

### Configuration

You can oJSXC in the admin panel of owncloud.

<dl>
	<dt>BOSH url</dt>
	<dd>The url to your bosh server. Please beware of the SOP. Use the Apache ProxyRequest or modify the CSP.</dd>

	<dt>XMPP domain</dt>
	<dd>The domain of your Jabber ID.</dd>

	<dt>XMPP resource</dt>
	<dd>The resource of your JID. If you leaf this field blank a random resource is generated.</dd>

	<dt>TURN url</dt>
	<dd>The url to your TURN server. You get a free account on http://numb.viagenie.ca</dd>

	<dt>TURN username</dt>
	<dd>If no username is set, the TURN REST API is used.</dd>

	<dt>TURN credential</dt>
	<dd>If no credential is set, the TURN REST API is used.</dd>

	<dt>TURN secret</dt>
	<dd>Secret for TURN REST API.</dd>

	<dt>TURN ttl</dt>
	<dd>Lifetime of credentials.</dd>
</dl>

### Screenshots

![Screenshot 1](https://raw.github.com/sualko/ojsxc/master/documentation/screenshot_1.png)
![Screenshot 2](https://raw.github.com/sualko/ojsxc/master/documentation/screenshot_2.png)
![Screenshot 3](https://raw.github.com/sualko/ojsxc/master/documentation/screenshot_3.png)

## Developer notes

Please execude the following commands to get a copy of the code:

```
git clone https://github.com/sualko/ojsxc/
git submodule update --init
```

### Libaries
- jQuery (http://jquery.com/)
- Strophe.js (http://strophe.im/strophejs/)
- Strophe.js Plugins (https://github.com/strophe/strophejs-plugins)
- OTR (https://github.com/arlolra/otr)
- strophe.jingle (https://github.com/ESTOS/strophe.jingle)

### Events
coming soon...
