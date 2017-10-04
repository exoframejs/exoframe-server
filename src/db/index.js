// npm packages
const path = require('path');
const Loki = require('lokijs');

// our packages
const {baseFolder} = require('../config');

// TTL for auth requests
const REQ_TTL =
  process.env.NODE_ENV !== 'testing'
    ? 5 * 60 * 1000 // 5 mins for prod
    : 0; // 0 for tests

// init in-memory adapter for login requests
const memAdapter = new Loki.LokiMemoryAdapter();
const fsAdapter = new Loki.LokiFsAdapter();

// init in-memory requests db
const db = new Loki('requests.db', {adapter: memAdapter, autoload: true});
// init persistent tokens db
let tokenCollection = {};
const tokenDb = new Loki(path.join(baseFolder, 'auth.db'), {
  adapter: process.env.NODE_ENV !== 'testing' ? fsAdapter : memAdapter,
  autoload: true,
  autoloadCallback() {
    // get of create tokens collection
    tokenCollection = tokenDb.getCollection('tokens');
    if (tokenCollection === null) {
      tokenCollection = tokenDb.addCollection('tokens');
    }
  },
  autosave: process.env.NODE_ENV !== 'testing',
});

// create requests collection
const reqCollection = db.addCollection('requests', {
  ttl: REQ_TTL,
  ttlInterval: REQ_TTL,
});

exports.db = db;
exports.tokenDb = tokenDb;
exports.reqCollection = reqCollection;
exports.getTokenCollection = () => tokenCollection;
