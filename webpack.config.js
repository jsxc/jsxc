/* jshint node:true */
const path = require("path");
const webpack = require("webpack");
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const JS_BUNDLE_NAME = 'jsxc.bundle.js';

const extractSass = new ExtractTextPlugin({
   filename: 'styles/jsxc.bundle.css',
   allChunks: true,
});

const packageJson = require('./package.json');
const dependencies = Object.keys(packageJson.dependencies).map(function(name) {
      let package = require('./node_modules/' + name + '/package.json');

      return `${package.name}@${package.version} (${package.license})`;
});

const definePlugin = new webpack.DefinePlugin({
   __VERSION__: JSON.stringify(packageJson.version),
   __BUILD_DATE__: JSON.stringify((new Date()).toDateString()),
   __BUNDLE_NAME__: JSON.stringify(JS_BUNDLE_NAME),
   __DEPENDENCIES__: JSON.stringify(dependencies.join(', ')),
});

const fileLoader = {
   loader: 'file-loader',
   options: {
      name: '[path][name]-[sha1:hash:hex:8].[ext]',
      outputPath: 'assets/'
   }
};

module.exports = {
   entry: ['./scss/main.scss', './src/index.ts'],
   output: {
      filename: JS_BUNDLE_NAME,
      path: path.resolve(__dirname, './dist/'),
      publicPath: 'dist/',
      libraryTarget: 'var',
      library: 'jsxc'
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
      definePlugin,
      new CleanWebpackPlugin(['dist']),
      new CopyWebpackPlugin([{
         from: 'images/',
         to: 'images/'
      }, {
         from: 'node_modules/emojione/assets/svg/',
         to: 'images/emojione/'
      }]),
      new webpack.LoaderOptionsPlugin({
            options: {
                  handlebarsLoader: {}
            }
      })
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
