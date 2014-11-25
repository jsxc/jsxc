var jsxc_options = {
  root: '/test/jsxc',
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

function count(hash) {
  return Object.keys(hash).length || 0;
}

function readFile(path) {
  var result = null;
  jQuery.ajax({
    url: path,
    success: function(data) { result = data },
    async: false
  });
  return result;
}

QUnit.test( "Check if we provide the correct locales", function( assert ) {
  var baseDir = '../../';

  Diaspora.I18n.language = 'en';
  jsxc.init(jsxc_options);
  var enLocales = readFile(baseDir + 'locales/en/translation.json');
  $.each(enLocales, function(key, val) {
    assert.ok($.t(key) == val, key + " equals the locale file");
  });

  Diaspora.I18n.language = 'de';
  jsxc.init(jsxc_options);
  var deLocales = readFile(baseDir + 'locales/de/translation.json');
  $.each(deLocales, function(key, val) {
    assert.ok($.t(key) == val, key + " equals the locale file");
  });

  Diaspora.I18n.language = 'es';
  jsxc.init(jsxc_options);
  var esLocales = readFile(baseDir + 'locales/es/translation.json');
  $.each(esLocales, function(key, val) {
    assert.ok($.t(key) == val, key + " equals the locale file");
  });

  assert.ok(
    (count(enLocales) == count(deLocales) == count(esLocales)),
    "Amount of entries of each locale file equals"
  );
});

