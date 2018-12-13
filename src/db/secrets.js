// npm packages
const path = require('path');
const Loki = require('lokijs');

// our packages
const {baseFolder} = require('../config');

// init in-memory adapter for login requests
const memAdapter = new Loki.LokiMemoryAdapter();
const fsAdapter = new Loki.LokiFsAdapter();

// init persistent secrets db
let secretsCollection = {};
let secretResolve = () => {};
const secretsInited = new Promise(r => {
  secretResolve = r;
});
const secretDb = new Loki(path.join(baseFolder, 'secrets.db'), {
  adapter: process.env.NODE_ENV !== 'testing' ? fsAdapter : memAdapter,
  autoload: true,
  autoloadCallback() {
    // get of create secrets collection
    secretsCollection = secretDb.getCollection('secrets');
    if (secretsCollection === null) {
      secretsCollection = secretDb.addCollection('secrets');
    }
    secretResolve();
  },
  autosave: process.env.NODE_ENV !== 'testing',
});

exports.secretDb = secretDb;
exports.getSecretsCollection = () => secretsCollection;
exports.secretsInited = secretsInited;
