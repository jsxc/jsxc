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
  loginForm: {
    form: '#jsxc_loginForm'
  },
  xmpp: {
    jid: 'test@test.de'
  },
  displayRosterMinimized: function() {
    return true;
  },
  loadSettings: function() {
    return false;
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

