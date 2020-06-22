# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## 4.1.1 (2020-06-22)
### Fixed
- [#897](https://github.com/jsxc/jsxc/issues/897) switching from online to online
- [#901](https://github.com/jsxc/jsxc/issues/901) stop propagation for key events
- [#894](https://github.com/jsxc/jsxc/issues/894) define sasl mechanisms
- [#896](https://github.com/jsxc/jsxc/issues/896) minimized audio call
- [#904](https://github.com/jsxc/jsxc/issues/904) call freeze on iphone
- [nextcloud/jsxc.nextcloud#148](https://github.com/nextcloud/jsxc.nextcloud/issues/148) turn lock green if all omemo devices are verified
- [#909](https://github.com/jsxc/jsxc/issues/909) play ringtone on incoming calls
- [#915](https://github.com/jsxc/jsxc/issues/915) remove DTMF jingle messages

### Misc
- update dependencies

## 4.1.0 (2020-05-15)
### Added
- wait 2 sec before marking msg as read
- mark message only as read if client is visible
- include jquery in build
- [#871](https://github.com/jsxc/jsxc/issues/871) add minimize button to video dialog
- show only chat messages in roster, no system messages
- sort roster by last message
- implement partially xmpp uri scheme, message and join
- multi account support
- improve new device handling (omemo)
- mark messages as not transferred
- encrypt file transfer (omemo)
- show file transfer progress
- [#683](https://github.com/jsxc/jsxc/issues/683) add plugin meta data
- show avatar placeholder while offline
- add audio stream to screen sharing call
- [#745](https://github.com/jsxc/jsxc/issues/745) implemented chat markers (XEP-0333)

### Fixed
- fix republishing of lost device id (omemo)
- fix bundle structure (omemo)
- xmpp attach failure results in start failure
- disable video handler for rooms
- fix support for anonymous accounts
- ui init for accounts without contacts
- room member list (muc)
- sound imports
- chat history flickering
- fix interface for disco info repo
- fix undefined error (me-command)
- fix some custom emoticons
- html escaping in remove dialog
- [#865](https://github.com/jsxc/jsxc/issues/865) disappearing muc sender name
- show avatar for historical muc msg
- mark chat windows with partial subscription
- fix fullscreen button
- bump max supported version for all plugins
- suppress chat state msg for unknown sender
- fix dialog for message from unknown sender
- restore notices on reload
- unread message sync
- remove mailto prefix from mail link
- fix roster badge on fullscreen
- handle failed RTC peer config request
- show notifications only for incoming messages
- show notifications for group messages
- do not overwrite trust level (omemo)

### Misc
- show webpack progress
- update locales
- use eval source map for dev
- update dependencies
- enhance release process
- improve pre commit hook
- remove unused code
- remove unused roster functions
- update travis script
- enhance muc member badge
- change color of messages
- improve fullscreen layout
- highlight unknown device in list (omemo)

## 4.0.0 - 2020-04-08
### Added
- OMEMO ([XEP-0384])
- MUC invitation
    - [#341](https://github.com/jsxc/jsxc/issues/341) mediated invitation
    - direct invitation ([XEP-0249])
    - both also via contact drag and drop
- [#6](https://github.com/jsxc/jsxc/issues/6) voice-only call
- [#501](https://github.com/jsxc/jsxc/issues/501) JID escaping ([XEP-0106])
- [#178](https://github.com/jsxc/jsxc/issues/178) add in-band password change ([XEP-0077])
- [#178](https://github.com/jsxc/jsxc/issues/178) add in-band registration ([XEP-0077])
- send file via file drop
- insert emoticon at cursor position
- MUC subject in window header
- full screen layout
- display presence messages
- option to disable all plugins
- highlight quotations
- show notice if offline contacts are hidden
- show notice if contact list is empty
- prepared multi account support (still experimental)
- [#512](https://github.com/jsxc/jsxc/issues/512) add option to specify storage backend
- show MUC avatars
- show mute icon in roster if notifications are muted
- support unicode emoticons
- show spinner while enabling encrypted transfer
- call all available resources at once
- add simple webcam test
- [#656](https://github.com/jsxc/jsxc/issues/656) support multiple incoming calls at once
- use sender avatar color as background color for group chat messages
- [#841](https://github.com/jsxc/jsxc/issues/841) add support for RTL messages

### Fixed
- video calls can now be initiated from any tab
- [#328](https://github.com/jsxc/jsxc/issues/328) MUC joining from any tab
- fix and improve emoticon insertion
- remove non-persistent contacts after login
- translate OTR status messages
- enhance roster insertion
- [#608](https://github.com/jsxc/jsxc/issues/608) reset window size if browser gets resized

### Changed
- use Consistent Color Generation ([XEP-0392])
- use more natural bounce animation for notice icon
- use object based public API
- use custom resource with jsxc prefix as default resource

### Developer notes
- [Typescript], [Webpack], [Handlebars], [Karma], [Mocha], [Chai] and [Sinon]
- removed `build` and `doc` folder, git submodules, bower and grunt
- share one XMPP connection across all tabs
- add plugin API
- form watcher instead of form option
- API to add roster menu entries (`jsxc.addMenuEntry()`)
- API to test BOSH server (`jsxc.testBOSHServer()`)
- use [SASS guidelines] and [BEM]-like style syntax
- add commit lint and require [Conventional Commits]

### Removed/Pending
- Jingle file transfer
- bookmarks

[Typescript]: http://www.typescriptlang.org
[Webpack]: https://webpack.js.org
[Handlebars]: https://handlebarsjs.com
[Karma]: http://karma-runner.github.io/2.0/index.html
[Mocha]: https://mochajs.org
[Chai]: https://www.chaijs.com
[Sinon]: https://sinonjs.org
[XEP-0392]: https://xmpp.org/extensions/xep-0392.html
[XEP-0077]: https://xmpp.org/extensions/xep-0077.html
[XEP-0106]: https://xmpp.org/extensions/xep-0106.html
[XEP-0249]: https://xmpp.org/extensions/xep-0249.html
[XEP-0384]: https://xmpp.org/extensions/xep-0384.html
[Conventional Commits]: https://www.conventionalcommits.org

## 3.1.1 - 2017-02-14
### Fixed
- fix path to dependencies

## 3.1.0 - 2017-02-14
### Added
- add application states
- [#393](https://github.com/jsxc/jsxc/issues/393) add the /me command (XEP-0245)
- [#422](https://github.com/jsxc/jsxc/issues/422) add multiline message support
- [#431](https://github.com/jsxc/jsxc/issues/431) add Chat State Notifications (XEP-0085)
- [#426](https://github.com/jsxc/jsxc/issues/426) add HTTP File Upload (XEP-0363)
- add Turkish
- [#438](https://github.com/jsxc/jsxc/issues/438) add desktop sharing
- add Nextcloud emoticon
- [#301](https://github.com/jsxc/jsxc/issues/301) add close all button for notices
- [#344](https://github.com/jsxc/jsxc/issues/344) support messages of type `headline`
- add icon to notices

### Fixed
- fix login form submission
- fix display of MUC warning
- [#391](https://github.com/jsxc/jsxc/issues/391) fix MUC initialisation after relogin
- [#394](https://github.com/jsxc/jsxc/issues/394) disable OTR for MUC conversations
- [#399](https://github.com/jsxc/jsxc/issues/399) prompt for MUC password if required
- [#435](https://github.com/jsxc/jsxc/issues/435) fix list of user name suggestions
- [#433](https://github.com/jsxc/jsxc/issues/433) fix i18n interpolation pattern
- fix minor WebRTC issues
- [#440](https://github.com/jsxc/jsxc/issues/440) prevent original login form submission
- [#441](https://github.com/jsxc/jsxc/issues/441) remove console.trace
- [#409](https://github.com/jsxc/jsxc/issues/409) fix presence after accepting contact request
- fix template system
- fix path to strophe.bookmarks (regression)
- fix disabled login form
- fix carbon copy impersonation vulnerability ([CVE-2017-5589+](https://rt-solutions.de/en/2017/02/CVE-2017-5589_xmpp_carbons/))
- ignore malicious roster updates (similar to [CVE-2014-0364](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2014-0364))
- prevent double insertion of MUC setting

### Changed
- update dependencies
- [#385](https://github.com/jsxc/jsxc/issues/385) update i18next
- improve initial focus for login box
- add large emoticons
- [#421](https://github.com/jsxc/jsxc/issues/421) make MUC server field editable
- system message style
- disable sending of OTR whitespace tag by default
- enable carbon copies by default
- remove border radius from dialog
- exclude dev dependencies from build
- move jquery library to example folder
- omit unreadable OTR messages

## 3.0.1 - 2016-10-28
### Added
- add room configuration in master tab
- improve muc multi tab support
- update/add languages: zh, pt, hu, pl, en, pt
- use user preferred browser languages
- remove inline styles

### Fixed
- fix multi-tab support
- fix uncaught type error on login
- fix second call issue
- fix option retrieval
- fix auto-accept
- fix the answer to anything
- fix boolean muc configurations

### Changed
- allow selector for options.logoutElement
- attach also with parameters from options.xmpp

## 3.0.0 - 2016-03-11
### Added
- responsive material-like design
 - refactoring settings dialog
 - over 1600 emoticons from emojione
 - support mobile devices
 - new video call interface
 - status usable for daltonian
 - use css for animations
- file transfer via WebRTC
 - previews
 - show progress
- use local date and time format
- add no-video-call-possible icon
- add disabled OTR icon
- add padlock icon to message
- display line breaks in chat messages
- hide avatar for connected messages (MUC)
- auto approve incoming contact request (if contact is already in our roster)

### Fixed
- use crendential when performing turn credential ajax crossdomain call
- update favico.js
- update strophe.js
- update strophe.jinglejs
- improve otr verification
- update locales
- reset unread counter on logout
- fix blank video
- fix hang up video call
- fix debug information
- fix muc message without id
- fix type error in jingle error

### Changed
- remove "develop" branch and use instead "master" branch
- Makefile for setup developer environment
- remove loginTimeout option
- add new jsxc.start function to start chat with password or sid/rid
- add new option loginForm.ifFound (deprecates loginForm.attachIfFound)
- add named dialogs
- new message object
- remove outdated stuff
- merge jsxc.webrtc.css into jsxc.css

## 2.1.5 - 2015-11-17
- Reset TURN credentials on login
- Fix IE&lt;11 textfield

## 2.1.4 - 2015-09-10
- remove leading at sign from comments in build file

## 2.1.3 - 2015-09-08
- fix bookmark loading
- show unread notifications only if the chat window has no focus

## 2.1.2 - 2015-08-12
- update grunt-sass (fix invalid css)

## 2.1.1 - 2015-08-10
- update strophe.jingle (fix login with Safari and older versions of IE, FF, Chrome)
- update favico.js
- fix undefined error variable in IE
- fix handling of escaped JIDs (e.g. used in transports)
- fix placeholder replacement
- rearrange bootstrap import
- add option for custom online user manual

## 2.1.0 - 2015-07-31
- add bookmark feature for rooms (XEP-0048)
- add reserved room feature for muc (XEP-0045#10.1.3)
- add counter of unread messages to roster, window and favicon
- add join as URI query type
- add ru language
- add roster resize hint
- make dialog responsive
- allow messages to persons without valid friendship
- replace video library for more stable connection
- fix DSA key generation in Chrome &gt; 42
- fix minor roster UI issues

- add jsbeautifier and prettysass
- improve example
- extract templates to single files
- replace colorbox with magnific popup
- use parts of bootstrap
- replace strophe.jingle with strophe.jinglejs (jingle.js)
- concatenate strings for better translatability
- add new option attach if login form was found
- add new option loginForm.startMinimized
- add new option loginForm.enable (deprecates xmpp.onlogin)
- add new option RTCPeerConfig.url (deprecates turnCredentialsPath)
- ICE servers can now be passed as init option
- loadSettings option is no longer required and supports now async requests

## 2.0.1 - 2015-05-23
- improve login box
- fix browsers without CSPRNG generator
- fix AJAX login after credential failure
- fix some WebRTC issues
- fix login with different username after dirty logout
- remove IE (&lt;11) gradient
- remove broken MITM detection
- fix temporary template 404
- fix login option
- add connecting event

## 2.0.0 - 2015-05-08
- add multi-user chat (XEP-0045)
- add window resize handle
- add username autocomplete
- add offline state
- add Italian, French, Polish, Portuguese/Brazil
- use user avatar as notification icon
- show notifications if tabs has no focus
- split files into namespaces
- SASS improvements
- replace own translation engine with i18next
- fix login from login box
- fix selection of chat messages
- fix video calls
- fix emoticons
- fix duplicated roster items
- fix notification request
- fix logout

## 1.1.0a - 2015-02-25
- fix CSS URL path

## 1.1.0 - 2015-01-08
- move from plain CSS to SASS
- show avatar also by EXTVAL (URL), not only by BINVAL
- add XEP-0280 (Message Carbons)
- add XEP-0297 (Stanza Forwarding)
- add option to disable OTR
- add timestamp to messages
- add AJAX/prebind login
- fix offline subscription request
- fix hide offline contacts
- fix error with multiple own resources
- fix avatars with newlines

## 1.0.0 - 2014-11-06
- add unread flag to roster and scroll to target window
- add XEP-0147 URI Scheme Query support
- add has-come-online notification
- add silent notification request
- add more information in vCard view
- add resizable function to chat window
- add vertical scrollbar to window list
- add call information to chat window
- add concatenated and uglified files
- add translations
- minor video call improvements
- minor style improvements
- generate DSA key complete in background
- update caps node property to jsxc.org
- update strophe.jingle
- update OTR
- fix wrong avatars
- fix minor message delivery errors
- fix FF snapshot security error
- fix case sensitive resource handling
- fix non-square avatars
- fix several video issues
- fix messages from unknown (not in roster) jid
- fix vCard retrieval from unknown (not in roster) jid
- fix vCard in second tab
- fix JIDs with non-word characters (replace user identifier)
- improve video window design
- improve user info
- improve login box
- improve SMP user interaction
- improve notifications (sync sound/message, icon)
- minor chat window improvements
- detect email in message
- detect URI scheme in message
- end all private conversations on logout
- remove email pattern from contact dialog
- disable video on second tab
- add/require DISCO DTLS feature for WebRTC
- move emoticons to CSS
- handle loadSettings failure
- change cursor for some elements
- prevent event bubbling for dialog

## 0.8.2 - 2014-08-20
- fix use of custom username
- write to console only if debug flag is set
- allow string|boolean as config param
- add translations

## 0.8.1 - 2014-08-12
- add user-defined xmpp options
- fix login form without id submit

## 0.8.0 - 2014-07-02
- add spanish translation
- add vCard view
- add more emoticons
- add grayscale to buddies without subscription
- add settings for priorities
- add hint if roster is empty
- add sound files
- new chat window design
- enhanced roster design
- fix emoticon replacement (XEP-0038)
- fix some UI issues (explanations,...)
- fix issue with password only field

## 0.7.2 - 2014-05-28
- fix login issue
- fix different dialogs
- fix Safari mobile bug
- fix webworker debugging
- fix issue with Prosody
- fix submodule state
- add debug flag
- add icon for video calls
- add general stylesheet + vector images
- add multiple translations
- add link to online help
- handle webworker security error
- remove outline glow
- reduce tooltip delay
- remove already confirmed friendship request from notice stack
- minor style fixes
- move complete to new notification api

## 0.7.1 - 2014-03-18
- fix emoticons
- fix unique message id

## 0.7.0 - 2014-03-07
- add sound notifications
- add support for custom default avatars
- add support for XEP-0184 (Message Delivery Receipts)
- update & extend hover info
- handle presence of type unsubscribed
- remove roster footer if offline
- enhance OTR error handling
- enhance translations
- reduce initial timeout
- fix notices
- fix friendship response dialog
- fix shared roster item removel
- fix debug function
- fix WebRTC bug
- fix storage check
- fix Firefox fullscreen

## 0.6.0 - 2014-02-28
- add notice stack (for e.g. friendship requests)
- add option to change presence
- support all available presence states
- display own avatar
- fix issue with Prosody
- fix multi-tab support
- fix Chrome notifications
- fix OTR error handling
- fix WebRTC bug

## 0.5.2 - 2014-01-28
- update strophe.js to v1.1.3
- fix debug function (fix initial presence)
- add debug log window
- add warn|error debug functions

## 0.5.1 - 2014-01-27
- fix chat window after call
- fix NULL pointer and context in WebRTC
- handle already attached submit events on login form
- style changes
- fix WebRTC startup
- don't block application on DSA key generation
