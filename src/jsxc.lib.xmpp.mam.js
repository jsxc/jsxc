/**
 * Implements XEP-0313: Messge Archive Management
 *
 * @namespace jsxc.xmpp.mam
 * @see {@link http://xmpp.org/extensions/xep-0313.html}
 */

/**
 *General policy is to load the history when a chat box or room opens up.
 *The user will firstly request for n messages and when it scrolls
 *up and reaches the end, then it again request for another n messages.
 *It goes on further untill no message is left in the archive. The
 *server replies with no more message in the history
 *
 *archivedMessagePageSize = '20' //No. of messages in one page
 *
 *rsmAttributes = ['max', 'first', 'last', 'after', 'before', 
 *'index', 'count']
 *
 *mamAttributes = ['with', 'start', 'end']
 *
 *messageArchiving = 'never' // Supported values are 'always', 'never',
 * 'roster' (See https://xmpp.org/extensions/xep-0313.html#prefs )
 *
 *mucHistoryMaxStanzas: undefined, // Takes an integer, limits the 
 *amount of messages to fetch from chat room's history
 *
 */

jsxc.xmpp.mam = {
  conn: jsxc.xmpp.conn
};


jsxc.xmpp.mam.getHistory = function(bid) {
  /*
  To include the whole functionality of strophe-plugin we used self
  */
  var self = jsxc.xmpp.conn.mam;
  /*
  ownjid is the jid of the person who is logged in
  */
  var ownjid = jsxc.xmpp.conn.jid;

  // Now we are converting the jid into bid
  var ownbid = jsxc.jidToBid(ownjid);

  console.log(bid);
  //console.log(ownbid);
  // We are calling the strophe plugin as specified by them
  self.query(ownbid, {
    with: bid, 
    before: "", 
    onMessage: function(message) {
      /*
      The message looks like this:
      <message xmlns="jabber:client" from="ownbid" to="bid">
        <result xmlns="urn:xmpp:mam:0" id="1485155123866746">
          <forwarded xmlns="urn:xmpp:forward:0">
            <message xmlns="jabber:client" from="jid from which message is sent" to="bid who recived the message" type="chat" id="1485141093744:msg">
              <body>gdhjcb</body>
              <request xmlns="urn:xmpp:receipts"></request>
              <delay xmlns="urn:xmpp:delay" from="serverAddress" stamp="2017-01-23T03:11:43.446Z">Offline Storage</delay>
            </message>
            <delay xmlns="urn:xmpp:delay" from="serverAddress" stamp="2017-01-23T07:05:23.867Z"></delay>
          </forwarded>
        </result>
        <no-store xmlns="urn:xmpp:hints"></no-store>
      </message>
      
      */
      var direction;

      /*
      Check the direction of the message i.e. In which direction messages are exchanged.
      */
      if(bid === $(message).find("forwarded message").attr("to")){
        direction = "out";
      }
      else{
        direction = "in";
      }
      var timeOfMessage = $(message).find("forwarded delay").attr("stamp");
      var stamp = new Date(timeOfMessage).getTime();
      var msgBody = $(message).find("forwarded message body").text();
      var mamUid = $(message).find("result").attr("id") + ":msg";
      var msg = {
        "_uid": mamUid,
        "_received": false,
        "encrypted": false,

        /* 
        forwarded is true becuase we don't want the user to get notifications 
        of the old messages
        */
        "forwarded": true,
        /*
        For stamp we pass the number of milliseconds that have been passed since 
        05 January, 1975. Please change the date format
        */
        "stamp": stamp,

        "type": "plain",
        "bid": bid,
        "direction": direction,
        "msg": msgBody
      };


      //This line is not working
      jsxc.gui.window.postMessage(msg);
      if(isNaN(msg.stamp)){
        console.log("I found null stamp");
        return true;
      }
      return true;
    },
    onComplete: function(response) {
      console.log("Got all the messages" + response);
    }
  });
};

//example code to query an personal archive for conversations with 
//juliet@capulet.com

/*
connection.mam.query("you@example.com", {
  "with": "juliet@capulet.com",
  onMessage: function(message) {
            console.log("Message from ", $(message).find("forwarded message").attr("from"),
                ": ", $(message).find("forwarded message body").text());
            return true;
  },
  onComplete: function(response) {
            console.log("Got all the messages");
  }
    });
*/


/*jsxc.xmpp.mam.getHistory = function (userid, count, before){
    var q = {
      onMessage: function(message) {
        //attach a code in here to view the message in the chat window

        var id = message.querySelector('result').getAttribute('id');
        var fwd = message.querySelector('forwarded');
        var d = fwd.querySelector('delay').getAttribute('stamp');
        var msg = fwd.querySelector('message');
        var msg_data = {
            id:id,
            timestamp: (new Date(d)),
            timestamp_orig: d,
            from: Strophe.getBareJidFromJid(msg.getAttribute('from')),
            to: Strophe.getBareJidFromJid(msg.getAttribute('to')),
            type: msg.getAttribute('type'),
            body: msg.getAttribute('body'),
            message: Strophe.getText(msg.getElementsByTagName('body')[0])
        };

        var sender = Strophe.getBareJidFromJid(msg_data.from);

        console.log(d + ': ' + sender + ' said: ' + msg_data.message + '<br>');
        return true;
      },

      onComplete: function(response) {
        //attach a code in here to notify when all the message has reached
        
    	console.log(response);
        return true;
      }
    };

    $.extend(q, {'with': userid, 'before': before, 'max': count});

    jsxc.xmpp.conn.mam.query(jsxc.bid, q);
  }
};
*/