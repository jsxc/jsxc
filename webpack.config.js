/* jshint node:true */
const path = require('path');
const webpack = require('webpack');
const packageJson = require('./package.json');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const GitRevisionPlugin = new(require('git-revision-webpack-plugin'))();
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const DEVELOPMENT_MODE = 'development';
const PRODUCTION_MODE = 'production';
const MOMENTJS_LOCALES = ['de', 'jp', 'nl', 'fr', 'zh', 'tr', 'pt', 'el', 'ro', 'pl', 'es', 'ru', 'it', 'hu'];
const JS_BUNDLE_NAME = 'jsxc.bundle.js';

const extractSass = new ExtractTextPlugin({
   filename: 'styles/jsxc.bundle.css',
   allChunks: true,
});

const dependencies = Object.keys(packageJson.dependencies).map(function(name) {
   let package = require('./node_modules/' + name + '/package.json');

   return `${package.name}@${package.version} (${package.license})`;
});

let version = packageJson.version + '-git.' + GitRevisionPlugin.version();
let buildDate = (new Date()).toDateString();
let definePluginConfig = {
   __BUILD_DATE__: JSON.stringify(buildDate),
   __BUNDLE_NAME__: JSON.stringify(JS_BUNDLE_NAME),
   __DEPENDENCIES__: JSON.stringify(dependencies.join(', ')),
};

const fileLoader = {
   loader: 'file-loader',
   options: {
      name: '[path][name]-[sha1:hash:hex:8].[ext]',
      outputPath: 'assets/'
   }
};

let config = {
   entry: ['./scss/main.scss', './src/index.ts'],
   output: {
      filename: JS_BUNDLE_NAME,
      chunkFilename: "[name].chunk.js",
      path: path.resolve(__dirname, './dist/'),
      publicPath: 'dist/',
      libraryTarget: 'var',
      library: 'jsxc'
   },
   optimization: {
      splitChunks: {
         minSize: 10,
      },
   },
   node: {
      fs: 'empty'
   },
   module: {
      rules: [{
            test: /\.ts$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
         },
         {
            test: /\.hbs$/,
            loader: 'handlebars-loader',
            exclude: /node_modules/,
            options: {
               helperDirs: [
                  path.resolve(__dirname, 'template', 'helpers')
               ],
               partialDirs: [
                  path.resolve(__dirname, 'template', 'partials')
               ]
            }
         },
         {
            test: /\.css$/,
            use: extractSass.extract({
               use: 'css-loader?importLoaders=1',
            }),
         },
         {
            test: /\.(sass|scss)$/,
            use: extractSass.extract({
               use: [{
                  loader: 'css-loader',
                  options: {
                     url: false
                  }
               }, 'sass-loader']
            })
         },
         {
            test: /.*\.(png|jpg|gif|mp3|wav)$/,
            use: [fileLoader]
         },
         {
            test: /.*\.(js)$/,
            resourceQuery: /path/,
            use: [fileLoader]
         }
      ]
   },
   resolve: {
      extensions: [".ts", ".js", ".hbs"],
      alias: {
         '@connection': path.resolve(__dirname, 'src/connection/'),
         '@ui': path.resolve(__dirname, 'src/ui/'),
         '@util': path.resolve(__dirname, 'src/util/'),
         '@vendor': path.resolve(__dirname, 'src/vendor/'),
         '@src': path.resolve(__dirname, 'src/'),
      }
   },
   externals: {
      'jquery': 'jQuery',
      'child_process': 'child_process',
      'webworker-threads': 'webworker-threads'
   },
   plugins: [
      extractSass,
      new CleanWebpackPlugin(['dist']),
      new CopyWebpackPlugin([{
         from: 'images/',
         to: 'images/'
      }, {
         from: 'node_modules/emojione/assets/svg/',
         to: 'images/emojione/'
      }, {
         from: 'LICENSE',
         to: 'LICENSE',
         toType: 'file',
      }]),
      new webpack.LoaderOptionsPlugin({
         options: {
            handlebarsLoader: {}
         }
      }),
      new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, new RegExp(MOMENTJS_LOCALES.join('|'))),
   ],
   devServer: {
      port: 8091,
      inline: true,
      open: true,
      openPage: 'example/ts.html',
      proxy: {
         "/http-bind": "http://localhost:5280"
      },
      watchOptions: {
         aggregateTimeout: 1300,
         ignored: "/dist/"
      }
   },
};

module.exports = (env, argv) => {

   if (argv.release) {
      version = packageJson.version;
   }

   if (argv.bundleAnalyzer) {
      config.plugins.push(new BundleAnalyzerPlugin());
   }

   definePluginConfig['__VERSION__'] = JSON.stringify(version);
   config.plugins.push(new webpack.DefinePlugin(definePluginConfig));

   config.plugins.push(new webpack.BannerPlugin({
      banner: `JavaScript XMPP Client - the open chat

Version: ${version}
Build date: ${buildDate}
${packageJson.homepage}

JSXC is released under the MIT license, but this file also contains
dependencies which are released under a different license.`
   }));

   return config;
};
