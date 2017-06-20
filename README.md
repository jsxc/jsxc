# JavaScript XMPP Client 4.0

[![Build Status](https://travis-ci.org/jsxc/jsxc.svg?branch=master)](https://travis-ci.org/jsxc/jsxc)
[![Dependency Status](https://dependencyci.com/github/jsxc/jsxc/badge)](https://dependencyci.com/github/jsxc/jsxc)

Real-time chat app. This app requires an external XMPP server (openfire, ejabberd etc.).

You find a full list of features, supported protocols and browsers on [our homepage](http://www.jsxc.org).

If you are looking for install instructions or developer notes, please also checkout our [wiki](https://github.com/jsxc/jsxc/wiki/).

## Rewrite / Refactoring
:warning: This branch is under heavy construction and definitely not ready for production.

This next big step for JSXC uses [Typescript](http://www.typescriptlang.org/index.html), [Webpack](https://webpack.github.io), [Handlebars](http://handlebarsjs.com), [Karma](http://karma-runner.github.io), [Mocha](https://mochajs.org), [Chai](http://chaijs.com) and [Sinon](http://sinonjs.org) to bring the best open XMPP chat experience to you. Currently we ship no packed version, so install all dependencies with `npm install` and execute `npm run dev` to test the current state. An example application is available at `example/ts.html`. To run all tests, enter `npm test`.
