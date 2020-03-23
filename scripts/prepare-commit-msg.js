const fs = require('fs');
const path = require('path');
const lintConfig = require('../.commitlintrc.json');

const allowedTypes = lintConfig.rules['type-enum'][2];
const params = (process.env.HUSKY_GIT_PARAMS || '').split(' ');

const getCommitMessage = () => {
   return `

# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
# In this project we use standardized commit messages. Please adhere
# to the following syntax.
#
#    <type>: <description>
#
#    [optional body]
#
#    [optional footer]
#
# Allowed types are: ${allowedTypes.join(', ')}.
#
# If you fix an issue please add 'fix #NUMBER' to the footer and NOT
# to the description.
#
# See https://www.conventionalcommits.org/ for more details.`;
};

// only apply custom messages when run as a standalone `git commit`
// i.e. ignore `--amend` commits, merges, or commits with `-m`
if (params.length > 1) {
   process.exit();
}

if (!params[0]) {
   console.log(getCommitMessage());

   process.exit();
}

const TARGET = path.resolve(process.cwd(), params[0]);
fs.writeFileSync(TARGET, `${getCommitMessage()}`);
