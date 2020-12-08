/* jshint node:true */
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const packageJson = require('./package.json');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const GitRevisionPlugin = new(require('git-revision-webpack-plugin'))();
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

let supportedLangs = fs.readdirSync('./locales/').filter(filename => {
   if (!/\.json$/.test(filename)) {
      return false;
   }

   let file = require(`./locales/${filename}`);

   for (let key in file.translation) {
      if (typeof file.translation[key] === 'string') {
         return true;
      }
   }

   return false;
}).map(filename => filename.replace(/\.json$/, ''));

const MOMENTJS_LOCALES = supportedLangs.map(lang => lang.replace(/-.+/, ''));
const JS_BUNDLE_NAME = 'jsxc.bundle.js';

const dependencies = Object.keys(packageJson.dependencies).map(function (name) {
   let package = require('./node_modules/' + name + '/package.json');

   return `${package.name}@${package.version} (${package.license})`;
});

let version = packageJson.version.replace(/-.+$/, '') + '-git.' + GitRevisionPlugin.version();
let buildDate = (new Date()).toDateString();
let definePluginConfig = {
   __BUILD_DATE__: JSON.stringify(buildDate),
   __BUNDLE_NAME__: JSON.stringify(JS_BUNDLE_NAME),
   __DEPENDENCIES__: JSON.stringify(dependencies.join(', ')),
   __LANGS__: JSON.stringify(supportedLangs),
};

const fileLoader = {
   loader: 'file-loader',
   options: {
      name: '[path][name]-[sha1:hash:hex:8].[ext]',
      outputPath: 'assets/'
   }
};

const OUTPUT_PATH = path.resolve(__dirname, './dist/');

let config = {
   entry: ['./scss/main.scss', './src/index.ts'],
   output: {
      filename: JS_BUNDLE_NAME,
      chunkFilename: "[name].chunk.js",
      path: OUTPUT_PATH,
      publicPath: 'dist/',
      libraryTarget: 'var',
      library: 'JSXC'
   },
   optimization: {
      splitChunks: {
         minSize: 10,
         cacheGroups: {
            styles: {
               name: 'styles',
               test: /\.css$/,
               chunks: 'all',
               enforce: true
            }
         }
      },
      minimizer: [
         new TerserPlugin({
            terserOptions: {
               keep_fnames: /Session$/,
            },
         }),
      ],
   },
   performance: {
      maxEntrypointSize: 1024 * 1000 * 1000 * 3,
      maxAssetSize: 1024 * 1000 * 1000 * 3,
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
            use: [
               MiniCssExtractPlugin.loader,
               'css-loader?importLoaders=1',
            ],
         },
         {
            test: /\.(sass|scss)$/,
            use: [
               MiniCssExtractPlugin.loader, {
                  loader: 'css-loader',
                  options: {
                     url: false
                  }
               },
               'sass-loader'
            ]
         },
         {
            test: /.*\.(png|jpg|gif|mp3|wav|svg)$/,
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
      extensions: [".ts", ".js", ".hbs", ".json"],
      alias: {
         '@connection': path.resolve(__dirname, 'src/connection/'),
         '@ui': path.resolve(__dirname, 'src/ui/'),
         '@util': path.resolve(__dirname, 'src/util/'),
         '@vendor': path.resolve(__dirname, 'src/vendor/'),
         '@src': path.resolve(__dirname, 'src/'),
      },
      // prep for Webpack 5
      // fallback: {
      //    fs: false,
      //    stream: false,
      //    path: false,
      //    crypto: false,
      // }
   },
   externals: {
      'child_process': 'child_process',
      'webworker-threads': 'webworker-threads'
   },
   plugins: [
      new webpack.ProvidePlugin({
         $: 'jquery',
         jQuery: 'jquery'
      }),
      new MiniCssExtractPlugin({
         filename: 'styles/jsxc.bundle.css',

      }),
      new CleanWebpackPlugin({
         cleanStaleWebpackAssets: false,
      }),
      new CopyWebpackPlugin({
         patterns: [{
            from: 'images/',
            to: 'images/'
         }, {
            from: 'fonts/',
            to: 'fonts/'
         }, {
            from: 'node_modules/emojione/assets/svg/',
            to: 'images/emojione/'
         }, {
            from: 'LICENSE',
            to: 'LICENSE',
            toType: 'file',
         }],
      }),
      new webpack.LoaderOptionsPlugin({
         options: {
            handlebarsLoader: {}
         }
      }),
      new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, new RegExp(MOMENTJS_LOCALES.join('|'))),
   ],
   devServer: {
      // https://github.com/webpack/webpack-dev-server/issues/2484
      injectClient: false,
      port: 8091,
      inline: true,
      publicPath: '/dist/',
      open: true,
      openPage: 'example/index.html',
      proxy: {
         "/http-bind": "http://localhost:5280",
         "/libsignal": "http://localhost",
         "/xmpp-websocket": "ws://localhost:5280"
      },
      watchOptions: {
         aggregateTimeout: 1300,
         ignored: [
            path.resolve(__dirname, 'dist'),
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '.git'),
            path.resolve(__dirname, 'test'),
            '**/*.swp',
         ]
      }
   },
};

module.exports = (env, argv) => {

   if (typeof argv.mode === 'string') {
      config.mode = argv.mode;
   }

   if (config.mode === 'development') {
      config.devtool = 'eval-source-map';
   }

   if (argv.release) {
      version = packageJson.version;
   }

   if (argv.bundleAnalyzer) {
      config.plugins.push(new BundleAnalyzerPlugin());
   }

   definePluginConfig['__VERSION__'] = JSON.stringify(version);

   // prep for Webpack 5
   // definePluginConfig['process'] = JSON.stringify({});
   // definePluginConfig['process.env.NODE_DEBUG'] = JSON.stringify(process.env.NODE_DEBUG || false);

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
