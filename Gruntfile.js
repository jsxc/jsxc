/* global module:false */
module.exports = function(grunt) {

   // Project configuration.
   grunt.initConfig({
      app: grunt.file.readJSON( 'app.json' ),
      meta: {
         banner:  '/**\n' +
                  ' * <%= app.name %> v<%= app.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                  ' * \n' +
                  ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= app.author %> <br>\n' +
                  ' * Released under the <%= app.license %> license\n' +
                  ' * \n' +
                  ' * Please see <%= app.homepage %>\n' +
                  ' * \n' +
                  ' * @author <%= app.author %>\n' +
                  ' * @version <%= app.version %>\n' + 
                  ' */\n\n'
      },
      jshint: {
         options: { 
            jshintrc: '.jshintrc'
         },
         gruntfile: {
            src: 'Gruntfile.js'
         },
         files: [ 'jsxc.lib.webrtc.js', 'jsxc.lib.js' ]
      },
      copy: {
         main: {
            files: [ {
               expand: true,
               src: [ 'lib/strophe.jingle/*.js', 'lib/otr/build/**', 'lib/otr/lib/dsa-webworker.js', 
                      'lib/otr/lib/sm-webworker.js', 'lib/otr/lib/const.js', 'lib/otr/lib/helpers.js', 
                      'lib/otr/lib/dsa.js', 'lib/otr/vendor/*.js', 'lib/*.js', 'jsxc.lib.js', 'jsxc.lib.webrtc.js', 'LICENSE' ],
               dest: 'build/'
            } ]
         }
      },
      clean: [ 'build/' ],
      usebanner: {
         dist: {
           options: {
             position: 'top',
             banner: '<%= meta.banner %>'
           },
           files: {
             src: [ 'build/*.js' ]
           }
         }
       },
       replace: {
          version: {
            src: ['build/jsxc.lib.js'],
            overwrite: true,           
            replacements: [{ 
              from: '<%= app.version %>',
              to: '<%= app.version %>'
            }]
          }
        }
   });

   // These plugins provide necessary tasks.
   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-contrib-copy');
   grunt.loadNpmTasks('grunt-contrib-clean');
   grunt.loadNpmTasks('grunt-banner');
   grunt.loadNpmTasks('grunt-text-replace');

   // Default task.
   grunt.registerTask('default', [ 'jshint', 'clean', 'copy', 'usebanner', 'replace' ]);

};
