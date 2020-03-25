// npm packages
const Loki = require('lokijs');

const memAdapter = new Loki.LokiMemoryAdapter();

// TTL for auth requests
const REQ_TTL =
  process.env.NODE_ENV !== 'testing'
    ? 5 * 60 * 1000 // 5 mins for prod
    : 0; // 0 for tests

// init in-memory requests db
const db = new Loki('requests.db', {adapter: memAdapter, autoload: true});

// create requests collection
const reqCollection = db.addCollection('requests', {
  ttl: REQ_TTL,
  ttlInterval: REQ_TTL,
});

module.exports = {
  reqCollection,
};
