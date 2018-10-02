require('colors').setTheme({
   verbose: 'cyan',
   warn: 'yellow',
   error: 'red',
});

const fs = require('fs');
const path = require('path');
const args = {
   mode: 'production',
};
const config = require('../webpack.config.js')(undefined, args);
const version = JSON.parse(config.plugins[config.plugins.length - 2].definitions['__VERSION__']);

createRelease();

async function createRelease() {
   console.log(`I'm now building JSXC version ${version}.`.verbose);

   await createBuild();
   let filePath = await createArchive(version);
   await createSignature(filePath);
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

   archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
         console.warn('Archive warning: '.warn, err);
      } else {
         throw err;
      }
   });

   archive.on('error', function(err) {
      throw err;
   });

   archive.pipe(output);

   archive.directory('dist/', 'jsxc');

   return new Promise(resolve => {
      output.on('close', function() {
         console.log(`Wrote ${archive.pointer()} bytes to ${fileName}`.verbose);

         resolve(filePath);
      });

      archive.finalize();
   });
}

function createSignature(filePath) {
   const {
      exec
   } = require('child_process');

   return new Promise((resolve, reject) => {
      exec(`gpg --yes --detach-sign "${filePath}"`, (error, stdout, stderr) => {
         if (error) {
            throw error;
         }

         if (stdout) {
            console.log(`stdout: ${stdout}`);
         }

         if (stderr) {
            console.log(`stderr: ${stderr}`);
         }

         console.log(`Created detached signature: ${path.basename(filePath)}`.verbose);

         resolve();
      });
   });
}
