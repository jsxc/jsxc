require('colors');
const childProcess = require('child_process');

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BLACKLIST = ['console.'];
const BLACKLIST_REGEX = new RegExp(BLACKLIST.map(word => escapeRegex(word)).join('|'), 'g');

function exec(command) {
    return new Promise((resolve, reject) => {
        childProcess.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve([stdout, stderr]);
            }
        });
    });
}

async function getDiff() {
    let [output] = await exec('git diff --staged');

    return output.split('\n');
}

async function getAdditions() {
    let diff = await getDiff();

    return diff.filter(line => /^\+/.test(line));
}

getAdditions().then(additions => {
    let output = [];
    let currentFile;
    let currentFileAdded = false;

    for (let addition of additions) {
        if (/^\+\+\+/.test(addition)) {
            currentFile = addition;
            currentFileAdded = false;
        } else if (BLACKLIST_REGEX.test(addition)) {
            if (!currentFileAdded) {
                output.push(currentFile);
                currentFileAdded = true;
            }

            output.push(addition);
        }
    }

    if (output.length) {
        console.log(`✖   Found some blacklisted terms. Please remove them before you commit our changes.`.red);
        console.log(output.join('\n').replace(BLACKLIST_REGEX, (match) => match.yellow));

        process.exit(1);
    }
})
