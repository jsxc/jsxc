function fileExists(path) {
  var res = jQuery.ajax({url: path, async: false});
  return (res.status == 200)? true : false
}

QUnit.test( "Parse bower.json and check if main files exist", function( assert ) {
  var baseDir = '../../'
  var bowerFile = baseDir + 'bower.json';
  var result = JSON.parse(jQuery.ajax({url: bowerFile, async: false}).responseText);

  assert.ok(result != null, "bower.json exists");

  jQuery.each(result.main, function(i) {
    var file = result.main[i];
    assert.ok(fileExists(baseDir + file) == true, file + " exists");
  });
});
