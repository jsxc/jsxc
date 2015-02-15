var Diaspora = {
  I18n: {
    language: 'en'
  }
};

var jsxc_options = {
  root: '../../',
  rosterAppend: 'body',
  otr: {
    debug: true,
    SEND_WHITESPACE_TAG: true,
    WHITESPACE_START_AKE: true
  },
  autoLang: true,
  priority: {
    online: 1,
    chat: 1
  },
  displayRosterMinimized: function() {
    return true;
  },
  xmpp: {
    url: '/http-bind/',
    username: 'test',
    domain: 'example.org',
    jid: 'test@example.org',
    password: 'secr3t',
    resource: 'diaspora-jsxc',
    overwrite: true,
    onlogin: true
  }
};

QUnit.test( "Check if we provide the correct locales", function( assert ) {
  Diaspora.I18n.language = 'invalidLanguage';
  // check locales in offline mode
  jsxc.storage.setUserItem('presence', 'offline');

  jsxc.init(jsxc_options);
  assert.ok(I18next != null);
  // should match fallback language 'en'
  $.each(I18next.en.translation, function(key, val) {
    assert.ok($.t(key) == val, "\"" + val + "\" equals \"" + $.t(key) + "\"");
  });

  Diaspora.I18n.language = 'en';
  jsxc.init(jsxc_options);
  assert.ok(I18next != null);
  $.each(I18next.en.translation, function(key, val) {
    assert.ok($.t(key) == val, "\"" + val + "\" equals \"" + $.t(key) + "\"");
  });

  Diaspora.I18n.language = 'de';
  jsxc.init(jsxc_options);
  assert.ok(I18next != null);
  $.each(I18next.de.translation, function(key, val) {
    assert.ok($.t(key) == val, "\"" + val + "\" equals \"" + $.t(key) + "\"");
  });

  Diaspora.I18n.language = 'es';
  jsxc.init(jsxc_options);
  assert.ok(I18next != null);
  $.each(I18next.es.translation, function(key, val) {
    assert.ok($.t(key) == val, "\"" + val + "\" equals \"" + $.t(key) + "\"");
  });
});

