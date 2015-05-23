v2.0.1 / 2015-05-23
===
- improve login box
- fix browsers without CSPRNG generator
- fix ajax login after credential failure
- fix some webrtc issues
- fix login with different username after dirty logout
- remove ie (<11) gradient
- remove broken mitm detection
- fix temporary template 404
- fix login option
- add connecting event

v2.0.0 / 2015-05-08
===
- add multi-user chat (XEP-0045)
- add window resize handle
- add username autocomplete
- add offline state
- add Italian, French, Polish, Portuguese/Brazil
- use user avatar as notification icon
- show notifications if tabs has no focus
- split files into namespaces
- sass improvements
- replace own translation engine with i18next
- fix login from login box
- fix selection of chat messages
- fix video calls
- fix emoticons
- fix duplicated roster items
- fix notification request
- fix logout

v1.1.0a / 2015-02-25
===
- fix css url path

v1.1.0 / 2015-01-08
===
- move from plain css to sass
- show avatar also by EXTVAL (url), not only by BINVAL
- add XEP-0280 (Message Carbons)
- add XEP-0297 (Stanza Forwarding)
- add option to disable otr
- add timestamp to messages
- add ajax/prebind login
- fix offline subscription request
- fix hide offline contacts
- fix error with multiple own resources
- fix avatars with newlines

v1.0.0 / 2014-11-06
===
- add unread flag to roster and scroll to target window
- add XEP-0147 URI Scheme Query support
- add has-come-online notification
- add silent notification request
- add more information in vCard view
- add resizable function to chat window
- add vertical scrollbar to window list
- add call information to chat window
- add concatinated and uglified files
- add translations
- minor video call improvements
- minor style improvements
- generate dsa key complete in background
- update caps node property to jsxc.org
- update strophe.jingle
- update otr
- fix wrong avatars
- fix minor message delivery errors 
- fix ff snapshot security error
- fix case sensitive resource handling
- fix non-square avatars
- fix several video issues
- fix messages from unknown (not in roster) jid
- fix vcard retrieval from unknown (not in roster) jid
- fix vcard in second tab
- fix jids with non-word characters (replace user identifier)
- improve video window design
- improve user info
- improve login box
- improve smp user interaction
- improve notifications (sync sound/message, icon)
- minor chat window improvements
- detect email in message
- detect uri scheme in message
- end all private conversations on logout
- remove email pattern from contact dialog
- disable video on second tab
- add/require disco dtls feature for webrtc
- move emoticons to css
- handle loadSettings failure
- change cursor for some elements
- prevent event bubbling for dialog

v0.8.2 / 2014-08-20
===
- fix use of custom username
- write to console only if debug flag is set
- allow string|boolean as config param
- add translations

v0.8.1 / 2014-08-12
===
- add user-defined xmpp options
- fix login form without id submit

v0.8.0 / 2014-07-02
===
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
- fix some ui issues (explanations,...)
- fix issue with password only field

v0.7.2 / 2014-05-28
===
- fix login issue
- fix different dialogs
- fix safari mobile bug
- fix webworker debugging
- fix issue with prosody
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


v0.7.1 / 2014-03-18
===
- fix emoticons
- fix unique message id

v0.7.0 / 2014-03-07
===
- add sound notifications
- add support for custom default avatars
- add support for XEP-0184 (Message Delivery Receipts)
- update & extend hover info
- handle presence of type unsubscribed
- remove roster footer if offline
- enhance otr error handling
- enhance translations
- reduce initial timeout
- fix notices
- fix friendship response dialog
- fix shared roster item removel
- fix debug function
- fix webrtc bug
- fix storage check
- fix firefox fullscreen

v0.6.0 / 2014-02-28
===
- add notice stack (for e.g. friendship requests)
- add option to change presence
- support all available presence states
- display own avatar
- fix issue with prosody
- fix multi-tab support
- fix chrome notifications
- fix otr error handling
- fix webrtc bug

v0.5.2 / 2014-01-28
===
- update strophe.js to v1.1.3
- fix debug function (fix initial presence)
- add debug log window
- add warn|error debug functions

v0.5.1 / 2014-01-27
===
- fix chat window after call
- fix nullpointer and context in webrtc
- handle already attached submit events on login form
- style changes
- fix webrtc startup
- don't block application on dsa key generation
