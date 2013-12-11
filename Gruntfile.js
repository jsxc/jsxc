/* global module:false */
module.exports = function(grunt) {

   // Project configuration.
   grunt.initConfig({
      jshint: {
         options: { 
            jshintrc: '.jshintrc'
         },
         gruntfile: {
            src: 'Gruntfile.js'
         },
         files: [ 'js/lib/jsxc.lib.webrtc.js', 'js/lib/jsxc.lib.js', 'js/ojsxc.js' ]
      },
      copy: {
         main: {
            files: [ {
               expand: true,
               src: [ 'js/plugin/*.js', 'js/strophe.jingle/*.js', 'js/otr/build/**', 'js/otr/lib/dsa-webworker.js', 'js/otr/lib/sm-webworker.js', 'js/otr/lib/const.js', 'js/otr/lib/helpers.js', 'js/otr/lib/dsa.js', 'js/otr/vendor/*.js', 'js/*.js', 'js/lib/*', 'css/*', 'appinfo/*', 'ajax/*', 'img/*', 'templates/*', 'settings.php', 'LICENSE' ],
               dest: 'build/'
            } ]
         }
      },
      clean: [ 'build/' ]
   });

   // These plugins provide necessary tasks.
   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-contrib-copy');
   grunt.loadNpmTasks('grunt-contrib-clean');

   // Default task.
   grunt.registerTask('default', [ 'jshint', 'clean', 'copy' ]);

};
