# JavaScript XMPP Client 4.0

[![Build Status](https://travis-ci.org/jsxc/jsxc.svg?branch=master)](https://travis-ci.org/jsxc/jsxc)
[![Documentation Status](https://readthedocs.org/projects/jsxc/badge/?version=latest)](https://jsxc.readthedocs.io/en/latest/?badge=latest)


Real-time chat app. This app requires an external XMPP server (openfire, ejabberd etc.).

You find a full list of features, supported protocols and browsers on [our homepage](http://www.jsxc.org).

If you are looking for install instructions or developer notes, please also checkout our [wiki](https://github.com/jsxc/jsxc/wiki/).

## Rewrite / Refactoring
:warning: This branch is under heavy construction and definitely not ready for production.

This next big step for JSXC uses [Typescript](http://www.typescriptlang.org/index.html), [Webpack](https://webpack.github.io), [Handlebars](http://handlebarsjs.com), [Karma](http://karma-runner.github.io), [Mocha](https://mochajs.org), [Chai](http://chaijs.com) and [Sinon](http://sinonjs.org) to bring the best open XMPP chat experience to you. Currently we ship no packed version, so install all dependencies with `yarn install` and execute `yarn dev` to test the current state. An example application is available at `example/index.html`. To run all tests, enter `yarn test`.
