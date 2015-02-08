/* global module:false */
module.exports = function(grunt) {

   var dep = grunt.file.readJSON('dep.json');
   var dep_files = dep.map(function(el) {
      return el.file;
   });

   // Project configuration.
   grunt.initConfig({
      app: grunt.file.readJSON('package.json'),
      meta: {
         banner: grunt.file.read('banner.js')
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
               src: [ 'lib/strophe.jingle/*.js', 'lib/otr/build/**', 'lib/otr/lib/dsa-webworker.js', 'lib/otr/lib/sm-webworker.js', 'lib/otr/lib/const.js', 'lib/otr/lib/helpers.js', 'lib/otr/lib/dsa.js', 'lib/otr/vendor/*.js', 'lib/*.js', 'jsxc.lib.js', 'jsxc.lib.webrtc.js', 'LICENSE', 'img/**', 'sound/**' ],
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
            src: [ 'build/jsxc.lib.js' ],
            overwrite: true,
            replacements: [ {
               from: '< $ app.version $ >',
               to: "<%= app.version %>"
            } ]
         }
      },
      concat: {
         dep: {
            options: {
               banner: '/*!\n' +
                  ' * <%= app.name %> v<%= app.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                  ' * \n' +
                  ' * This file concatenates all dependencies of <%= app.name %>.\n' +
                  ' * \n' +
                  ' */\n\n',
               process: function(src, filepath) {
                  if (filepath === 'build/lib/otr/build/dep/crypto.js') {
                     src += ';';
                  }

                  var data = dep[dep_files.indexOf(filepath)];

                  return '/*!\n * Source: ' + filepath + ', license: ' + data.license + ', url: ' + data.url + ' */\n' + src;
               }
            },
            src: dep_files,
            dest: 'build/lib/jsxc.dep.js'
         },
         jsxc: {
            options: {
               banner: '/*! This file is concatenated for the browser. */\n\n'
            },
            src: ['build/jsxc.lib.js', 'build/jsxc.lib.webrtc.js'],
            dest: 'build/jsxc.js'
         }
      },
      uglify: {
         jsxc: {
            options: {
               mangle: false,
               sourceMap: true,
               preserveComments: 'some'
            },
            files: {
               'build/lib/jsxc.dep.min.js': ['build/lib/jsxc.dep.js'],
               'build/jsxc.min.js': ['build/jsxc.js']
            }
         }
      },
      search: {
         console: {
            files: {
               src: [ '*.js' ]
            },
            options: {
               searchString: /console\.log\((?!'[<>]|msg)/g,
               logFormat: 'console',
               failOnMatch: true
            }
         },
         changelog: {
            files: {
               src: [ 'CHANGELOG.md' ]
            },
            options: {
               searchString: "<%= app.version %>",
               logFormat: 'console',
               onComplete: function(m) {
                  if (m.numMatches === 0) {
                     grunt.fail.fatal("No entry in CHANGELOG.md for current version found.");
                  }
               }
            }
         }
      },
      compress: {
         main: {
            options: {
               archive: "archives/jsxc-<%= app.version %>.zip"
            },
            files: [ {
               src: [ '**' ],
               expand: true,
               dest: 'jsxc/',
               cwd: 'build/'
            } ]
         }
      },
      dataUri: {
        dist: {
          src: 'css/*.css',
          dest: 'build/css/',
          options: {
            target: ['img/*.*', 'img/**/*.*'],
            fixDirLevel: true,
            baseDir: './'
          }
        }
      },
      jsdoc: {
          dist: {
              src: ['jsxc.lib.js', 'jsxc.lib.webrtc.js'],
              dest: 'doc'
          }
      },
      autoprefixer: {
            no_dest: {
                src: 'css/*.css'
            }
      },
      csslint: {
        strict: {
            options: {
            import: 2
            },
            src: ['css/*.css']
        },
      },
      sass: {
        options: {
           imagePath: '../img'
        },
        dist: {
            files: {
            'css/jsxc.css': 'scss/jsxc.scss',
            'css/jsxc.webrtc.css': 'scss/jsxc.webrtc.scss'
            }
        }
      },
   });

   // These plugins provide necessary tasks.
   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-contrib-copy');
   grunt.loadNpmTasks('grunt-contrib-clean');
   grunt.loadNpmTasks('grunt-contrib-concat');
   grunt.loadNpmTasks('grunt-contrib-uglify');
   grunt.loadNpmTasks('grunt-banner');
   grunt.loadNpmTasks('grunt-text-replace');
   grunt.loadNpmTasks('grunt-search');
   grunt.loadNpmTasks('grunt-contrib-compress');
   grunt.loadNpmTasks('grunt-jsdoc');
   grunt.loadNpmTasks('grunt-data-uri');
   grunt.loadNpmTasks('grunt-contrib-csslint');
   grunt.loadNpmTasks('grunt-sass');
   grunt.loadNpmTasks('grunt-autoprefixer');

   //Default task
   grunt.registerTask('default', [ 'css' ]);

   // Create new build
   grunt.registerTask('build', [ 'search:changelog', 'pre', 'jsdoc' ]);

   // Create alpha/beta build
   grunt.registerTask('pre', [ 'jshint', 'search:console', 'clean', 'css', 'dataUri', 'copy', 'usebanner', 'replace', 'concat', 'uglify', 'compress' ]);

   // before commit
   grunt.registerTask('commit', [ 'jshint', 'search:console' ]);

   grunt.registerTask('css', [ 'sass', 'autoprefixer' ]);
};
