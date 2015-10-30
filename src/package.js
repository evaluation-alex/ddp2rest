Package.describe({
  name: 'xamfoo:ddp2rest',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  'basic-auth': '1.0.3'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.1');
  api.use([
    'ecmascript',
    'webapp',
    'underscore',
    'ddp',
    'ddp-common',
    'mongo',
    'random',
    'ejson',
    'check'
  ], 'server');
  api.addFiles([
    'util/maybeIf.js',
    'util/memoizeMidWare.js',
    'util/deepExtendObj.js',
    'middleware.js',
    'proxy-connection.js',
    'connection-manager.js',
    'auth-server.js',
    'server.js',
    'index.js'
  ], 'server');
  api.export('ddp2rest');
  api.imply('webapp', 'server');
});

Package.onTest(function(api) {
  api.versionsFrom('1.2.0.1');
  api.use('xamfoo:ddp2rest', 'server');
  api.use('tinytest');
  api.use([
    'ecmascript',
    'mongo',
    'http',
    'ejson',
    'check',
    'underscore',
    'accounts-password'
  ], 'server');
  api.addFiles([
    'util/maybeIf.js',
    'test/bootstrap.js',
    'test/test-routes.js',
    'test/test-server.js'
  ], 'server');
});
