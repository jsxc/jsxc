/* jshint node:true */
var path = require("path");

module.exports = {
   entry: './src/index.ts',
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
         }
      ]
   },
   resolve: {
      extensions: [".ts", ".js", ".hbs"]
   },
   externals: {
      'jquery': 'jQuery'
   },
};
