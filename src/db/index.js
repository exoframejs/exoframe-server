// npm packages
const Loki = require('lokijs');

// init in-memory db for login requests
const REQ_TTL =
  process.env.NODE_ENV !== 'testing'
    ? 5 * 60 * 1000 // 5 mins for prod
    : 0; // 0 for tests
const memAdapter = new Loki.LokiMemoryAdapter();
const db = new Loki('requests.db', {adapter: memAdapter, autoload: true});
const reqCollection = db.addCollection('requests', {
  ttl: REQ_TTL,
  ttlInterval: REQ_TTL,
});

exports.db = db;
exports.reqCollection = reqCollection;
