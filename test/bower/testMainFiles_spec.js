function fileExists(path) {
  var exists = false;
  jQuery.ajax({
    url: path,
    success: function() { exists = true },
    async: false
  });
  return exists;
}

QUnit.test( "Parse bower.json and check if main files exist", function( assert ) {
  var baseDir = '../../'
  var bowerFile = baseDir + 'bower.json';
  var result = null;
  jQuery.ajax({
    url: bowerFile,
    success: function(data) { result = data },
    async: false
  });

  assert.ok(result != null, "bower.json exists");

  jQuery.each(result.main, function(i) {
    var file = result.main[i];
    assert.ok(fileExists(baseDir + file) == true, file + " exists");
  });
});
