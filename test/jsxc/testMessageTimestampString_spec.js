QUnit.test( "Check if we provide the correct time format in messages", function( assert ) {
  var now  = new Date().getTime(),
  zeroHours = 1420153200000;

  assert.equal(typeof jsxc.getFormattedTime, "function", "getFormattedTime is defined and a function type")
  assert.equal(jsxc.getFormattedTime(now).length, 5, "Current time should look like: 'HH:MM'");
  assert.equal(jsxc.getFormattedTime(zeroHours).length, 16, "Do not strip zero number from string and display: 'DD.MM.YYYY HH:MM'");
});

