# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## 3.2.1 - 2017-06-01
### Added
- add Greek translation

### Fixed
- fix thumbnail transfer
- fix handler for muc menu items
- catch undefined exception during file transfer
- fix disabled file transfer link
- [#542](https://github.com/jsxc/jsxc/issues/542) fix fallback language
- remove favicon badge after logout

### Changed
- reduce thumbnail size
- enable http upload for muc
- disable links in last message view

## 3.2.0 - 2017-05-17
### Added
- [#150](https://github.com/jsxc/jsxc/issues/150) add Message Archive Management (XEP-0313)
- [#464](https://github.com/jsxc/jsxc/issues/464) respond to software version request (XEP-0092)

### Fixed
- [#447](https://github.com/jsxc/jsxc/pull/447) fix muc member presence
- fix http upload discovery
- fix vcard retrieval for rooms
- fix bookmarks
- [#470](https://github.com/jsxc/jsxc/issues/470) fix receiving message from unknown sender
- [#483](https://github.com/jsxc/jsxc/issues/483) fix unclickable space
- catch quota exceeded errors (e.g. Safari in private mode has a quota of 0)
- [#510](https://github.com/jsxc/jsxc/pull/510) fix muc form
- [#505](https://github.com/jsxc/jsxc/pull/505) fix i18n key
- [#515](https://github.com/jsxc/jsxc/issues/515) fix add contact in slave tab
- fix initial roster loading
- fix xmpp message uri to unknown jid
- fix uri scheme handling if offline
- fix hiding of offline users in roster

### Changed
- update dependencies
   - strophe.jinglejs
   - grunt-contrib-clean
   - grunt-contrib-uglify
   - node-sass
   - strophe.chatstates
   - strophejs-plugin-mam
- make max file size optional for http upload service
- [#480](https://github.com/jsxc/jsxc/issues/480) split avatar loading into chunks
- [#478](https://github.com/jsxc/jsxc/issues/478) support roster versioning
- prefer xmpp password from settings over login form
- [#468](https://github.com/jsxc/jsxc/issues/468) move composing message to window header
- make message error more visible
- ignore message errors without id
- add data-bid to xmpp uris
- add roster state to roster ready event

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
