require('colors');
const config = require('../.commitlintrc.json');

console.log(`
✖   See https://www.conventionalcommits.org/ for more details.
    Allowed types: ${config.rules['type-enum'][2].join(', ')}`.red);

process.exit(1);
