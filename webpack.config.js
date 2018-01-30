/* jshint node:true */
const path = require("path");
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const extractSass = new ExtractTextPlugin({
 filename: 'styles/[name].bundle.css',
   allChunks: true,
});

module.exports = {
   entry: ['./scss/main.scss', './src/index.ts'],
   output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, './dist/'),
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
            query: {
                helperDirs: [
                  path.resolve(__dirname, "template", 'helpers')
               ],
               ignorePartials: ['list']
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
         }
      ]
   },
   resolve: {
      extensions: [".ts", ".js", ".hbs"]
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
      }])
  ],
};
