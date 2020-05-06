require('colors').setTheme({
    verbose: 'cyan',
    warn: 'yellow',
    error: 'red',
});

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const execa = require('execa');
const inquirer = require('inquirer');
const git = require('simple-git/promise')();
const package = require('../package.json');

require('dotenv').config();

const isDryRun = process.argv.indexOf('--dry-run') > 1;
const commitMessage = `release: ${package.version} :tada:`;
const tagName = `v${package.version}`;
const files = [
    path.join(__dirname, '..', 'archives', `jsxc-${package.version}.tar.gz`),
    path.join(__dirname, '..', 'archives', `jsxc-${package.version}.tar.gz.asc`),
    path.join(__dirname, '..', 'archives', `jsxc-${package.version}.tar.gz.sig`),
];

git.addConfig('versionsort.suffix', '-');

function pull() {
    return git.pull('origin', 'master');
}

async function isRepoClean() {
    const status = await git.status();

    if (status.staged.length > 0) {
        throw 'Repo not clean. Found staged files.';
    }

    if (status.modified.length > 1 || status.modified[0] !== 'package.json') {
        throw 'Repo not clean. Found modified files.';
    }

    if (status.not_added.length > 0) {
        throw 'Repo not clean, Found not added files';
    }
}

async function notAlreadyTagged() {
    if ((await git.tags()).all.includes(tagName)) {
        throw 'version already tagged';
    }
}

async function lastCommitNotBuild() {
    return (await git.log(['-1'])).latest.message !== commitMessage;
}

async function isMasterBranch() {
    return (await git.branch()) === 'master';
}

async function generateChangelog() {
    const latestTag = (await git.tags(['--sort=-version:refname'])).latest;
    const title = `v${package.version}` === latestTag ? '[Unreleased]' : `${package.version} (${new Date().toISOString().split('T')[0]})`;

    console.log(`use log between ${latestTag} and HEAD`.verbose);

    const logs = await git.log({
        from: latestTag,
        to: 'HEAD',
    });

    const sections = [{
        type: 'feat',
        label: 'Added',
    }, {
        type: 'fix',
        label: 'Fixed',
    }];

    const entries = {};

    logs.all.forEach(log => {
        const messageMatches = log.message.match(/^([a-z]+)(?:\(([\w-]+)\))?: (.+)/);

        if (!messageMatches) {
            return;
        }

        const [, type, scope, description] = messageMatches;
        const entry = { type, scope, description, issues: [] };

        if (['docs'].includes(type)) {
            return;
        }

        if (log.body) {
            const matches = log.body.match(/(?:fix|fixes|closes?|refs?) #(\d+)/g) || [];

            for (const match of matches) {
                const [, number] = match.match(/(\d+)$/);

                entry.issues.push(number);
            }
        }

        if (!entries[type]) {
            entries[type] = [];
        }

        entries[type].push(entry);
    });

    let changeLog = `## ${title}\n`;

    function stringifyEntry(entry) {
        const issues = entry.issues.map(issue => {
            return `[#${issue}](https://github.com/jsxc/jsxc/issues/${issue})`;
        }).join('');

        return `- ${issues}${issues.length > 0 ? ' ' : ''}${entry.description}${entry.scope ? ` (${entry.scope})`: ''}\n`;
    }

    sections.forEach(section => {
        if (!entries[section.type]) {
            return;
        }

        changeLog += `### ${section.label}\n`;

        entries[section.type].forEach(entry => {
            changeLog += stringifyEntry(entry);
        });

        delete entries[section.type];

        changeLog += '\n';
    });

    const miscKeys = Object.keys(entries);

    if (miscKeys && miscKeys.length > 0) {
        changeLog += '### Misc\n';

        miscKeys.forEach(type => {
            entries[type].forEach(entry => {
                changeLog += stringifyEntry(entry);
            });
        });
    }

    return changeLog;
}

async function editChangeLog(changeLog) {
    const answers = await inquirer.prompt([{
        type: 'editor',
        name: 'changeLog',
        message: 'You have now the possibility to edit the change log',
        default: changeLog,
    }]);

    return answers.changeLog;
}

function hasChangeLogEntry() {
    return new Promise(resolve => {
        fs.readFile(path.join(__dirname, '..', 'CHANGELOG.md'), function (err, data) {
            if (err) throw err;

            if (!data.includes(`## ${package.version}`) && package.version.match(/^\d+\.\d+\.\d+$/)) {
                throw `Found no change log entry for ${package.version}`;
            }

            resolve();
        });
    });
}

async function commitChangeLog() {
    if (!isDryRun) {
        await git.add('CHANGELOG.md');
        await git.commit('docs: update change log', ['-n']);
    }
}

async function hasArchiveAndSignatures() {
    return files.map(file => fs.existsSync(file)).indexOf(false) < 0;
}

async function stageAllFiles() {
    if (isDryRun) {
        return;
    }

    const gitProcess = execa('git', ['add', '-u']);

    gitProcess.stdout.pipe(process.stdout);

    return gitProcess;
}

function showStagedDiff() {
    const gitProcess = execa('git', ['diff', '--staged']);

    gitProcess.stdout.pipe(process.stdout);

    return gitProcess;
}

async function keypress() {
    return inquirer.prompt([{
        type: 'input',
        name: 'keypress',
        message: 'Press any key to continue... (where is the any key?)',
    }]);
}

function commit() {
    if (isDryRun) {
        return;
    }

    return git.commit(commitMessage, ['-S', '-n']);
}

async function wantToContinue(message) {
    const answers = await inquirer.prompt([{
        type: 'confirm',
        name: 'continue',
        message,
        default: false,
    }]);

    if (!answers.continue) {
        process.exit(10);
    }
}

function push() {
    if (isDryRun) {
        return;
    }

    return git.push('origin', 'master');
}

async function createGithubRelease(changeLog) {
    if (!process.env.GITHUB_TOKEN) {
        throw 'Github token missing';
    }

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
        userAgent: 'custom releaser for jsxc/jsxc',
    });

    const origin = (await git.remote(['get-url', 'origin'])).trim();
    const matches = origin.match(/^git@github\.com:(.+)\/(.+)\.git$/);

    if (!matches) {
        throw 'Origin is not configured or no ssh url';
    }

    const owner = matches[1];
    const repo = matches[2];
    const releaseOptions = {
        owner,
        repo,
        // eslint-disable-next-line @typescript-eslint/camelcase
        tag_name: tagName,
        name: `JavaScript XMPP Client ${tagName}`,
        body: changeLog.replace(/^## [^\n]+\n/, ''),
        prerelease: !/^\d+\.\d+\.\d+$/.test(package.version),
        draft: true,
    };

    if (isDryRun) {
        console.log('github release options', releaseOptions);
        return [];
    }

    const releaseResponse = await octokit.repos.createRelease(releaseOptions);

    console.log(`Draft created, see ${releaseResponse.data.html_url}`.verbose);

    function getMimeType(filename) {
        if (filename.endsWith('.asc') || filename.endsWith('sig')) {
            return 'application/pgp-signature';
        }

        if (filename.endsWith('.tar.gz')) {
            return 'application/gzip';
        }

        if (filename.endsWith('.ncsig')) {
            return 'text/plain';
        }

        return 'application/octet-stream';
    }

    const assetUrls = await Promise.all(files.map(async file => {
        const filename = path.basename(file);
        const uploadOptions = {
            owner,
            repo,
            // eslint-disable-next-line @typescript-eslint/camelcase
            release_id: releaseResponse.data.id,
            data: fs.createReadStream(file),
            headers: {
                'content-type': getMimeType(filename),
                'content-length': fs.statSync(file)['size'],
            },
            name: filename,
        };

        const assetResponse = await octokit.repos.uploadReleaseAsset(uploadOptions);

        console.log(`Asset uploaded: ${assetResponse.data.name}`.verbose);

        return assetResponse.data.browser_download_url;
    }));

    return assetUrls;
}

async function run() {
    await pull();
    console.log('✔ pulled latest changes'.green);

    await isRepoClean();
    console.log('✔ repo is clean'.green);

    await notAlreadyTagged();
    console.log('✔ not already tagged'.green);

    await lastCommitNotBuild();
    console.log('✔ last commit is no build commit'.green);

    await isMasterBranch();
    console.log('✔ this is the master branch'.green);

    let changeLog = await generateChangelog();
    console.log('✔ change log generated'.green);

    changeLog = await editChangeLog(changeLog);
    console.log('✔ change log updated'.green);

    console.log(changeLog);

    console.log('Press any key to continue...');
    await keypress();

    await hasChangeLogEntry();
    console.log('✔ there is a change log entry for this version'.green);

    await commitChangeLog();
    console.log('✔ change log commited'.green);

    await hasArchiveAndSignatures();
    console.log('✔ found archive and signatures'.green);

    await stageAllFiles();
    console.log('✔ all files staged'.green);

    await showStagedDiff();

    await wantToContinue('Should I commit those changes?');

    await commit();
    console.log('✔ All files commited'.green);

    await wantToContinue('Should I push all pending commits?');

    await push();
    console.log('✔ All commits pushed'.green);

    await wantToContinue('Should I continue to create a Github release?');

    await createGithubRelease(changeLog);
    console.log('✔ released on github'.green);
};

run().catch(err => {
    console.log(`✘ ${err.toString()}`.error);
});
