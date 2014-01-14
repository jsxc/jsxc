# JavaScript Xmpp Client

__Beware! This is beta software.__

Real-time chat app. This app requires external XMPP server (openfire, ejabberd etc.).

### Features
- integration into existing ui
- one-to-one conversation (XMPP)
- encrypted one-to-one conversation (OTR)
  - use of whitespace tags to start a OTR session
- user verification (SMP)
- encrypted one-to-one video call (WebRTC)
  - [TURN REST API](http://tools.ietf.org/html/draft-uberti-behave-turn-rest-00)
  - fullscreen mode
  - snapshots
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

## Developer notes

Please execude the following commands to get a copy of the code:

```
git clone https://github.com/sualko/jsxc/
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
