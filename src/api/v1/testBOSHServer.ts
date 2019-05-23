import ConnectionError from '../../errors/ConnectionError'
import InvalidParameterError from '../../errors/InvalidParameterError';

export function testBOSHServer(url, domain): Promise<string> {
   if (typeof url !== 'string') {
      throw new InvalidParameterError('You have to provide an URL as string.', 'invalid-url');
   }

   if (typeof domain !== 'string') {
      throw new InvalidParameterError('You have to provide a domain as string.', 'invalid-domain');
   }

   let rid = '123456';
   let requestString = `<body rid='${rid}' xmlns='http://jabber.org/protocol/httpbind' to='${domain}' xml:lang='en' wait='60' hold='1' content='text/xml; charset=utf-8' ver='1.6' xmpp:version='1.0' xmlns:xmpp='urn:xmpp:xbosh'/>`;

   return new Promise((resolve, reject) => {
      $.ajax({
         type: 'POST',
         url,
         data: requestString,
         global: false,
         dataType: 'xml'
      }).done(stanza => {
         try {
            let result = processResponse(stanza);

            resolve(result);
         } catch (err) {
            reject(err);
         }
      }).fail((xhr, textStatus) => {
         reject(processErrorResponse(xhr, textStatus, url));
      });
   });
}

function processResponse(stanza) {
   if (typeof stanza === 'string') {
      //@REVIEW shouldn't be needed anymore, because of dataType
      stanza = $.parseXML(stanza);
   }

   let body = $(stanza).find('body[xmlns="http://jabber.org/protocol/httpbind"]');
   let condition = (body) ? body.attr('condition') : null;
   let type = (body) ? body.attr('type') : null;

   // we got a valid xml response, but we have to test for errors

   if (body.length > 0 && type !== 'terminate') {
      return 'BOSH server reachable.';
   }

   if (condition === 'internal-server-error') {
      throw new ConnectionError('Internal server error: ' + body.text(), 'internal-server-error');
   } else if (condition === 'host-unknown') {
      throw new ConnectionError('Host unknown: Your domain is unknown to your XMPP server.', 'host-unknown');
   } else {
      throw new ConnectionError(condition, condition);
   }
}

function processErrorResponse(xhr, textStatus, url) {
   // no valid xml, not found or csp issue

   let urlWithProtocol;
   if (url.match(/^https?:\/\//)) {
      urlWithProtocol = url;
   } else {
      urlWithProtocol = window.location.protocol + '//' + window.location.host;

      if (url.match(/^\//)) {
         urlWithProtocol += url;
      } else {
         urlWithProtocol += window.location.pathname.replace(/[^/]+$/, '') + url;
      }
   }

   if (xhr.status === 0) {
      // cross-side
      return new ConnectionError('Cross domain request was not possible. Either your BOSH server does not send any ' +
         'Access-Control-Allow-Origin header or the content-security-policy (CSP) blocks your request. ' +
         'The savest way is still to use Apache ProxyRequest or Nginx proxy_pass.', 'cross-domain');
   } else if (xhr.status === 404) {
      // not found
      return new ConnectionError('Your server responded with "404 Not Found". Please check if your BOSH server is running and reachable via ' + urlWithProtocol + '.', 'not-found');
   } else if (textStatus === 'parsererror') {
      return new ConnectionError('Invalid XML received. Maybe ' + urlWithProtocol + ' was redirected. You should use an absolute url.', 'invalid-xml');
   } else {
      return new ConnectionError(xhr.status + ' ' + xhr.statusText, 'misc');
   }
}
