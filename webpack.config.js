/* jshint node:true */
var path = require("path");
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
   entry: ['./scss/main.scss', './src/index.ts'],
   output: {
      filename: 'bundle.js',
      path: __dirname,
      libraryTarget: 'var',
      library: 'jsxc'
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
                ]
              }
         },
         {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
               use: 'css-loader?importLoaders=1',
            }),
         },
         {
           test: /\.(sass|scss)$/,
           use: ExtractTextPlugin.extract({
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
      'jquery': 'jQuery'
   },
   plugins: [
      new ExtractTextPlugin({
        filename: 'css/bundle.css',
         allChunks: true,
      }),
  ],
};
