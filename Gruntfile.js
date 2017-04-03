/* global module:false */
module.exports = function(grunt) {

   var dep = grunt.file.readJSON('dep.json');
   var dep_files = dep.map(function(el) {
      return el.file;
   });
   dep_files.push('<%= target %>/lib/translation.js');

   // Project configuration.
   grunt.initConfig({
      github: grunt.file.readJSON('.github.json'),
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
               src: ['lib/emojione/assets/svg/*.svg',
                  'lib/otr/build/**', 'lib/otr/lib/*.js',
                  'lib/otr/vendor/*.js', 'lib/*.js', 'LICENSE',
                  'img/**', 'sound/**'
               ],
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

                  if (filepath.match(/crypto\.js$/)) {
                     src += ';';
                  }

                  var data = dep[dep_files.indexOf(filepath)];

                  if (data) {
                     return '\n/*!\n * Source: ' + filepath + ', license: ' + data.license + ', url: ' + data.url + '\n */\n' + src;
                  } else {
                     return src;
                  }
               }
            },
            src: dep_files,
            dest: '<%= target %>/lib/jsxc.dep.js',
            filter: function(filepath) {
               if (!grunt.file.exists(filepath)) {
                  grunt.fail.warn('Could not find: ' + filepath);
               } else {
                  return true;
               }
            },
            nonull: true,
         },
         jsxc: {
            options: {
               banner: '/*! This file is concatenated for the browser. */\n\n'
            },
            src: ['src/jsxc.intro.js', 'src/jsxc.lib.js', 'src/jsxc.lib.xmpp.js',
               'src/jsxc.lib.gui.js', 'src/jsxc.lib.*.js',
               'tmp/template.js', 'src/jsxc.outro.js'
            ],
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
         bower: {
            files: {
               src: ['bower.json']
            },
            options: {
               searchString: "<%= app.version %>",
               logFormat: 'console',
               onComplete: function(m) {
                  if (m.numMatches === 0) {
                     grunt.fail.fatal('No entry in bower.json for current version found.');
                  }
               }
            }
         },
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
         'default': {
            src: ['Gruntfile.js', 'src/jsxc.lib.*', 'template/*.html',
               'example/*.html', 'example/js/dev.js', 'example/js/example.js',
               'example/css/example.css'
            ],
            options: {
               config: '.jsbeautifyrc'
            }
         },
         'pre-commit': {
            src: ['Gruntfile.js', 'src/jsxc.lib.*', 'template/*.html',
               'example/*.html', 'example/js/dev.js', 'example/js/example.js',
               'example/css/example.css'
            ],
            options: {
               config: '.jsbeautifyrc',
               mode: 'VERIFY_ONLY'
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
      scsslint: {
         files: ['scss/*.scss'],
         options: {
            config: '.scss-lint.yml'
         }
      },
      github_releaser2: {
         options: {
            repository: 'jsxc/jsxc',
            authentication: {
               type: 'token',
               token: '<%= github.token %>'
            },
            release: {
               body: 'see https://github.com/jsxc/jsxc/blob/master/CHANGELOG.md'
            }
         },
         release: {
            src: ['archives/jsxc-archives/jsxc-<%= app.version %>.zip', 'archives/jsxc-archives/jsxc-<%= app.version %>.zip.sig']
         },
         prerelease: {
            options: {
               release: {
                  prerelease: true
               }
            },
            src: ['archives/jsxc-archives/jsxc-<%= app.version %>.zip', 'archives/jsxc-archives/jsxc-<%= app.version %>.zip.sig']
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
   grunt.loadNpmTasks('grunt-scss-lint');
   grunt.loadNpmTasks('grunt-github-releaser2');

   //Default task
   grunt.registerTask('default', ['build', 'watch']);

   grunt.registerTask('build', ['jshint', 'clean', 'sass', 'replace:imageUrl',
      'autoprefixer', 'copy', 'merge_data', 'replace:locales', 'htmlConvert',
      'replace:template', 'concat'
   ]);

   grunt.registerTask('build:prerelease', 'Build a new pre-release', function() {
      grunt.config.set('target', 'build');

      grunt.task.run(['search:console', 'search:bower', 'build', 'usebanner',
         'replace:version', 'replace:libraries', 'replace:todo',
         'uglify', 'compress'
      ]);
   });

   grunt.registerTask('build:release', 'Build a new release', function() {
      grunt.config.set('target', 'build');

      grunt.task.run(['search:changelog', 'build:prerelease', 'jsdoc']);
   });

   grunt.registerTask('publish:release', ['github_releaser2:release']);
   grunt.registerTask('publish:prerelease', ['github_releaser2:prerelease']);

   // before commit
   grunt.registerTask('pre-commit', ['search:console', 'jsbeautifier:pre-commit', 'scsslint', 'jshint']);

   grunt.registerTask('beautify', ['jsbeautifier', 'prettysass']);
};
