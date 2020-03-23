// jshint node:true

const webpackConfig = require('./webpack.config.js')({}, {});

module.exports = function(config) {
   config.set({

      // base path that will be used to resolve all patterns (eg. files, exclude)
      basePath: '',


      // frameworks to use
      // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
      frameworks: [ /*'karma-typescript',*/ 'mocha', 'chai'],


      // list of files / patterns to load in the browser
      files: [
         './node_modules/jquery/dist/jquery.min.js',
         './node_modules/es6-promise/dist/es6-promise.js',
         'test/*.spec.ts',
         'test/**/*.spec.ts'
      ],


      // list of files to exclude
      exclude: [],

      // webpack configuration
      webpack: {
         mode: 'development',
         devtool: 'eval-source-map',
         module: webpackConfig.module,
         resolve: webpackConfig.resolve,
         plugins: [
             webpackConfig.plugins[1],
             webpackConfig.plugins[webpackConfig.plugins.length - 2],
         ],
         node: {
            fs: 'empty'
         }
      },

      webpackMiddleware: {
        stats: 'errors-only',
      },

      mime: {
         'text/x-typescript': ['ts', 'tsx']
      },


      // preprocess matching files before serving them to the browser
      // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
      preprocessors: {
         'test/**/*.spec.ts': ['webpack' /*'karma-typescript'*/ ]
      },

      karmaTypescriptConfig: {
         include: ['test/**/*.spec.ts']
      },

      // test results reporter to use
      // possible values: 'dots', 'progress'
      // available reporters: https://npmjs.org/browse/keyword/karma-reporter
      reporters: [ /*'progress', 'karma-typescript',*/ 'mocha'],


      // web server port
      port: 9876,


      // enable / disable colors in the output (reporters and logs)
      colors: true,


      // level of logging
      // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
      logLevel: config.LOG_WARN,


      // enable / disable watching file and executing tests whenever any file changes
      autoWatch: true,


      // start these browsers
      // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
      browsers: ['ChromeHeadless'],

      // Continuous Integration mode
      // if true, Karma captures browsers, runs the tests and exits
      singleRun: false,

      // Concurrency level
      // how many browser should be started simultaneous
      concurrency: Infinity
   });
};
