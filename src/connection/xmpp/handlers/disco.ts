import * as NS from '../namespace'
import {AbstractConnection} from '../../AbstractConnection';
import Client from '../../../Client'

export function onDiscoInfo(stanza:Element) {
  let id = stanza.getAttribute('id');
  let from = stanza.getAttribute('from');
  let node = stanza.getElementsByTagName('query')[0].getAttribute('node');

  let iq = $iq({
    type: 'result',
    id: id,
    from: from
  }).c('query', {
    xmlns: NS.get('DISCO_INFO'),
    node: (node)? node : undefined
  });

  iq = addIdentitiesToStanza(iq);
  iq = addFeaturesToStanza(iq);

  getConnection().send(iq.tree());

  return true;
}

function addIdentitiesToStanza(iq) {
  for(let identity of Client.getAccout().getDiscoInfo().getIdentities()) {
    let attrs = {
      category: identity.category,
      type: identity.type,
      name: (identity.name)? identity.name : null,
      'xml:lang': (identity.lang)? identity.lang : null
    };

    iq.c('identity', attrs).up();
  }

  return iq;
}

function addFeaturesToStanza(iq) {
  for(let feature of Client.getAccout().getDiscoInfo().getFeatures()) {
    iq.c('feature', {
      'var': feature
    }).up();
  }

  return iq;
}

export function onDiscoItems(stanza:Element) {
  let id = stanza.getAttribute('id');
  let from = stanza.getAttribute('from');
  let node = stanza.getElementsByTagName('query')[0].getAttribute('node');

  let iq = $iq({
    type: 'result',
    id: id,
    from: from
  }).c('query', {
    xmlns: NS.get('DISCO_ITEMS'),
    node: (node)? node : undefined
  });

  //We return an empty set, because we dont support disco items

  getConnection().send(iq.tree());

  return true;
}

function getConnection() {
  let account = Client.getAccout();
  let connection = account.getConnection();

  return connection;
}
