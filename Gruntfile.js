/* global module:false */
module.exports = function(grunt) {

   var dep = grunt.file.readJSON('dep.json');
   var dep_files = dep.map(function(el) {
      return '<%= target %>/' + el.file;
   });

   // Project configuration.
   grunt.initConfig({
      app: grunt.file.readJSON('package.json'),
      meta: {
         banner: grunt.file.read('banner.js')
      },
      target: 'dev',
      jshint: {
         options: {
            jshintrc: '.jshintrc'
         },
         gruntfile: {
            src: 'Gruntfile.js'
         },
         files: ['src/jsxc.lib.*']
      },
      copy: {
         main: {
            files: [{
               expand: true,
               src: ['lib/i18next/release/i18next-latest.min.js', 'lib/strophe.jingle/*.js', 'lib/otr/build/**', 'lib/otr/lib/dsa-webworker.js', 'lib/otr/lib/sm-webworker.js', 'lib/otr/lib/const.js', 'lib/otr/lib/helpers.js', 'lib/otr/lib/dsa.js', 'lib/otr/vendor/*.js', 'lib/*.js', 'LICENSE', 'img/**', 'sound/**'],
               dest: '<%= target %>/'
            }, {
               expand: true,
               cwd: 'lib/',
               src: ['*.css'],
               dest: '<%= target %>/css/'
            }]
         }
      },
      clean: ['<%= target %>/'],
      usebanner: {
         dist: {
            options: {
               position: 'top',
               banner: '<%= meta.banner %>'
            },
            files: {
               src: ['<%= target %>/*.js']
            }
         }
      },
      replace: {
         version: {
            src: ['<%= target %>/jsxc.js'],
            overwrite: true,
            replacements: [{
               from: '< $ app.version $ >',
               to: "<%= app.version %>"
            }]
         },
         libraries: {
            src: ['<%= target %>/jsxc.js'],
            overwrite: true,
            replacements: [{
               from: '< $ dep.libraries $ >',
               to: function() {
                  var i, d, libraries = '';

                  for (i = 0; i < dep.length; i++) {
                     d = dep[i];
                     if (typeof d.name === 'string') {
                        libraries += '<a href="' + d.url + '">' + d.name + '</a> (' + d.license + '), ';
                     }
                  }

                  return libraries.replace(/, $/, '');
               }
            }]
         },
         locales: {
            src: ['<%= target %>/lib/translation.js'],
            overwrite: true,
            replacements: [{
               from: /^{/g,
               to: 'var I18next = {'
            }, {
               from: /}$/g,
               to: '};'
            }]
         }
      },
      merge_data: {
         target: {
            src: ['locales/*.{json,y{,a}ml}'],
            dest: '<%= target %>/lib/translation.js'
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
                  filepath = filepath.replace(/^[a-z]+\//i, '');

                  if (filepath === 'lib/otr/build/dep/crypto.js') {
                     src += ';';
                  }

                  var data = dep[dep_files.indexOf('<%= target %>/' + filepath)];

                  if (data) {
                     return '\n/*!\n * Source: ' + filepath + ', license: ' + data.license + ', url: ' + data.url + '\n */\n' + src;
                  } else {
                     return src;
                  }
               }
            },
            src: dep_files,
            dest: '<%= target %>/lib/jsxc.dep.js'
         },
         jsxc: {
            options: {
               banner: '/*! This file is concatenated for the browser. */\n\n'
            },
            src: ['src/jsxc.intro.js', 'src/jsxc.lib.js', 'src/jsxc.lib.*.js', 'src/jsxc.outro.js'],
            dest: '<%= target %>/jsxc.js'
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
               '<%= target %>/lib/jsxc.dep.min.js': ['<%= target %>/lib/jsxc.dep.js'],
               '<%= target %>/jsxc.min.js': ['<%= target %>/jsxc.js']
            }
         }
      },
      search: {
         console: {
            files: {
               src: ['src/*.js']
            },
            options: {
               searchString: /console\.log\((?!'[<>]|msg)/g,
               logFormat: 'console',
               failOnMatch: true
            }
         },
         changelog: {
            files: {
               src: ['CHANGELOG.md']
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
            files: [{
               src: ['**'],
               expand: true,
               dest: 'jsxc/',
               cwd: 'build/'
            }]
         }
      },
      dataUri: {
         dist: {
            src: '<%= target %>/css/*.css',
            dest: '<%= target %>/css/',
            options: {
               target: ['<%= target %>/img/*.*', '<%= target %>/img/**/*.*'],
               fixDirLevel: false,
               maxBytes: 2048
            }
         }
      },
      jsdoc: {
         dist: {
            src: ['src/jsxc.lib.*'],
            dest: 'doc'
         }
      },
      autoprefixer: {
         no_dest: {
            src: '<%= target %>/css/*.css'
         }
      },
      csslint: {
         strict: {
            options: {
               import: 2
            },
            src: ['<%= target %>/css/*.css']
         },
      },
      sass: {
         options: {
            imagePath: '../img'
         },
         dist: {
            files: {
               '<%= target %>/css/jsxc.css': 'scss/jsxc.scss',
               '<%= target %>/css/jsxc.webrtc.css': 'scss/jsxc.webrtc.scss'
            }
         }
      },
      watch: {
         locales: {
            files: ['locales/*'],
            tasks: ['merge_data', 'replace:locales', 'concat:dep']
         },
         css: {
            files: ['scss/*'],
            tasks: ['sass', 'autoprefixer']
         },
         js: {
            files: ['src/jsxc.lib.*'],
            tasks: ['concat:jsxc']
         }
      },
      jsbeautifier: {
         noIndentLevel: {
            src: ['Gruntfile.js', 'src/jsxc.lib.*'],
            options: {
               js: {
                  indentSize: 3,
                  endWithNewline: true
               }
            }
         }
      },
      prettysass: {
         options: {
            alphabetize: false,
            indent: 4
         },
         jsxc: {
            src: ['scss/*.scss']
         }
      }
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
   grunt.loadNpmTasks('grunt-merge-data');
   grunt.loadNpmTasks('grunt-contrib-csslint');
   grunt.loadNpmTasks('grunt-sass');
   grunt.loadNpmTasks('grunt-autoprefixer');
   grunt.loadNpmTasks('grunt-contrib-watch');
   grunt.loadNpmTasks('grunt-jsbeautifier');
   grunt.loadNpmTasks('grunt-prettysass');

   //Default task
   grunt.registerTask('default', ['build', 'watch']);

   grunt.registerTask('build', ['jshint', 'clean', 'sass', 'autoprefixer', 'copy', 'merge_data', 'replace:locales', 'concat']);

   grunt.registerTask('build:prerelease', 'Build a new pre-release', function() {
      grunt.config.set('target', 'build');

      grunt.task.run(['search:console', 'build', 'dataUri', 'usebanner', 'replace:version', 'replace:libraries', 'uglify', 'compress']);
   });

   grunt.registerTask('build:release', 'Build a new release', function() {
      grunt.config.set('target', 'build');

      grunt.task.run(['search:changelog', 'build:prerelease', 'jsdoc']);
   });

   // Create alpha/beta build @deprecated
   grunt.registerTask('pre', ['build:prerelease']);

   // before commit
   grunt.registerTask('commit', ['search:console', 'jsbeautifier', 'prettysass', 'jshint']);
};
