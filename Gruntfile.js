/* global module:false */
module.exports = function(grunt) {

   var dep = grunt.file.readJSON('dep.json');
   var dep_files = dep.map(function(el) {
      return '<%= target %>/' + el.file;
   });

   var git_cached = [];

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
         files: ['src/jsxc.lib.*.js']
      },
      copy: {
         main: {
            files: [{
               expand: true,
               src: ['lib/i18next/release/i18next-latest.min.js', 'lib/magnific-popup/dist/*.js', 'lib/favico.js/favico.js', 'lib/emojione/lib/js/*.js', 'lib/emojione/assets/svg/*.svg', 'lib/strophe.js/strophe.js', 'lib/strophe.x/*.js', 'lib/strophe.bookmarks/*.js', 'lib/strophe.vcard/*.js', 'lib/strophe.jinglejs/*-bundle.js', 'lib/otr/build/**', 'lib/otr/lib/dsa-webworker.js', 'lib/otr/lib/sm-webworker.js', 'lib/otr/lib/const.js', 'lib/otr/lib/helpers.js', 'lib/otr/lib/dsa.js', 'lib/otr/vendor/*.js', 'lib/*.js', 'LICENSE', 'img/**', 'sound/**'],
               dest: '<%= target %>/'
            }, {
               expand: true,
               cwd: 'lib/',
               src: ['*.css'],
               dest: '<%= target %>/css/'
            }, {
               expand: true,
               cwd: 'lib/magnific-popup/dist/',
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
               from: '<$ dep.libraries $>',
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
         },
         template: {
            src: ['tmp/template.js'],
            overwrite: true,
            replacements: [{
               from: 'var jsxc.gui.template = {};',
               to: ''
            }]
         },
         imageUrl: {
            src: ['<%= target %>/css/*.css'],
            overwrite: true,
            replacements: [{
               from: /image-url\(["'](.+)["']\)/g,
               to: 'url(\'../img/$1\')'
            }]
         },
         // IE 10 does not like comments starting with @
         todo: {
            src: ['build/jsxc.js'],
            overwrite: true,
            replacements: [{
               from: /\/\/@(.*)/g,
               to: '//$1'
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
            src: ['src/jsxc.intro.js', 'src/jsxc.lib.js', 'src/jsxc.lib.xmpp.js', 'src/jsxc.lib.*.js', 'tmp/template.js', 'src/jsxc.outro.js'],
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
            tasks: ['sass', 'autoprefixer', 'replace:imageUrl']
         },
         js: {
            files: ['src/jsxc.lib.*'],
            tasks: ['concat:jsxc']
         },
         template: {
            files: ['template/*.html'],
            tasks: ['htmlConvert', 'replace:template', 'concat:jsxc']
         }
      },
      jsbeautifier: {
         files: ['Gruntfile.js', 'src/jsxc.lib.*', 'template/*.html', 'example/*.html', 'example/js/dev.js', 'example/js/example.js', 'example/css/example.css'],
         options: {
            config: '.jsbeautifyrc'
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
      },
      htmlConvert: {
         options: {
            target: 'js',
            rename: function(name) {
               return name.match(/([-_0-9a-z]+)\.html$/i)[1];
            },
            quoteChar: '\'',
            indentString: '',
            indentGlobal: ''
         },
         'jsxc.gui.template': {
            src: 'template/*.html',
            dest: 'tmp/template.js'
         }
      },
      shell: {
         'precommit-before': {
            command: 'git diff --cached --name-only',
            options: {
               callback: function(err, stdout, stderr, cb) {
                  git_cached = stdout.trim().split(/\n/);

                  cb();
               }
            }
         },
         'precommit-after': {
            command: 'git diff --name-only',
            options: {
               callback: function(err, stdout, stderr, cb) {
                  var git_diff = stdout.trim().split(/\n/);
                  var intersection = [];
                  var i;

                  for (i = 0; i < git_diff.length; i++) {
                     if (git_cached.indexOf(git_diff[i]) >= 0) {
                        intersection.push(git_diff[i]);
                     }
                  }

                  if (intersection.length > 0) {
                     grunt.log.writeln();

                     for (i = 0; i < intersection.length; i++) {
                        grunt.log.writeln('> ' + intersection[i]);
                     }

                     grunt.fail.warn('Some files changed during pre-commit hook!');
                  }

                  cb();
               }
            }
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
   grunt.loadNpmTasks('grunt-html-convert');
   grunt.loadNpmTasks('grunt-shell');

   //Default task
   grunt.registerTask('default', ['build', 'watch']);

   grunt.registerTask('build', ['jshint', 'clean', 'sass', 'replace:imageUrl', 'autoprefixer', 'copy', 'merge_data', 'replace:locales', 'htmlConvert', 'replace:template', 'concat']);

   grunt.registerTask('build:prerelease', 'Build a new pre-release', function() {
      grunt.config.set('target', 'build');

      grunt.task.run(['search:console', 'build', 'usebanner', 'replace:version', 'replace:libraries', 'replace:todo', 'uglify', 'compress']);
   });

   grunt.registerTask('build:release', 'Build a new release', function() {
      grunt.config.set('target', 'build');

      grunt.task.run(['search:changelog', 'build:prerelease', 'jsdoc']);
   });

   // Create alpha/beta build @deprecated
   grunt.registerTask('pre', ['build:prerelease']);

   // before commit
   grunt.registerTask('commit', ['shell:precommit-before', 'search:console', 'jsbeautifier', 'prettysass', 'jshint', 'shell:precommit-after']);
};
