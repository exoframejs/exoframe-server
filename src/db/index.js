// npm packages
const path = require('path');
const Loki = require('lokijs');

// our packages
const {baseFolder} = require('../config');
const {reqCollection} = require('./requests');
const logger = require('../logger');

// init in-memory adapter for login requests
const memAdapter = new Loki.LokiMemoryAdapter();
const fsAdapter = new Loki.LokiFsAdapter();

let dbLoadedResolve = () => {};
const dbLoaded = new Promise(r => {
  dbLoadedResolve = r;
});

let tokenCollection = {};
let secretsCollection = {};
let deploysCollection = {};

// init persistent db
const db = new Loki(path.join(baseFolder, 'exoframe.db'), {
  adapter: process.env.NODE_ENV !== 'testing' ? fsAdapter : memAdapter,
  autoload: true,
  autoloadCallback() {
    // get or create tokens collection
    tokenCollection = db.getCollection('tokens');
    if (tokenCollection === null) {
      tokenCollection = db.addCollection('tokens');
    }

    // get or create secrets collection
    secretsCollection = db.getCollection('secrets');
    if (secretsCollection === null) {
      secretsCollection = db.addCollection('secrets');
    }

    // get or create deploys collection
    deploysCollection = db.getCollection('deploys');
    if (deploysCollection === null) {
      deploysCollection = db.addCollection('deploys');
    }

    // resolve waiting load promises
    dbLoadedResolve();
    logger.info('Database loaded.');
  },
  autosave: process.env.NODE_ENV !== 'testing',
});

// exports.mainDB = db;
exports.dbLoaded = dbLoaded;

exports.reqCollection = reqCollection;
exports.getTokenCollection = () => tokenCollection;
exports.getSecretsCollection = () => secretsCollection;
exports.getDeploysCollection = () => deploysCollection;
