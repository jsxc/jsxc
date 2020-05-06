require('colors').setTheme({
   verbose: 'cyan',
   warn: 'yellow',
   error: 'red',
});

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const args = {
   mode: 'production',
   release: process.argv.indexOf('--stable') > 1,
};
const config = require('../webpack.config.js')(undefined, args);
const version = JSON.parse(config.plugins[config.plugins.length - 2].definitions['__VERSION__']);

createRelease().catch(err => {
	console.log(`✘ ${err.toString()}`.error);
});

async function createRelease() {
   console.log(`I'm now building JSXC version ${version}.`.verbose);

   await execa('yarn', ['checking']);
   console.log('✔ all code checks passed'.green);

   await execa('yarn', ['test']);
   console.log('✔ all tests passed'.green);

   await createBuild();
   console.log('✔ build created'.green);

   let filePath = await createArchive('jsxc-' + version);

   await createGPGSignature(filePath);
   console.log(`✔ created detached signature: ${path.basename(filePath)}`.green);

   await createGPGArmorSignature(filePath);
   console.log(`✔ created detached signature: ${path.basename(filePath)}.asc`.green);
}

function createBuild() {
   const compiler = require('webpack')(config);

   return new Promise(resolve => {
      compiler.run((err, stats) => {
         if (err) {
            console.error(err);
            return;
         }

         console.log(stats.toString('minimal'));

         resolve();
      });
   });
}

function createArchive(fileBaseName) {
   let fileName = `${fileBaseName}.tar.gz`;
   let filePath = path.normalize(__dirname + `/../archives/${fileName}`);
   let output = fs.createWriteStream(filePath);
   let archive = require('archiver')('tar', {
      gzip: true,
   });

   archive.on('warning', function (err) {
      if (err.code === 'ENOENT') {
         console.warn('Archive warning: '.warn, err);
      } else {
         throw err;
      }
   });

   archive.on('error', function (err) {
      throw err;
   });

   archive.pipe(output);

   archive.directory('dist/', 'jsxc');

   return new Promise(resolve => {
      output.on('close', function () {
         console.log(`✔ wrote ${archive.pointer()} bytes to ${fileName}`.green);

         resolve(filePath);
      });

      archive.finalize();
   });
}

function createGPGSignature(filePath) {
   return execa('gpg', ['--yes', '--detach-sign', filePath]);
}

function createGPGArmorSignature(filePath) {
   return execa('gpg', ['--yes', '--detach-sign', '--armor', filePath]);
}
