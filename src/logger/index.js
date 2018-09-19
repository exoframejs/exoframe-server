const {Signale} = require('signale');

// prepare level
const levelTesting = process.env.NODE_ENV === 'testing' ? 'error' : false;
const level = levelTesting || process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const logger = new Signale({
  scope: 'exoframe-server',
  types: {
    debug: {
      stream: level === 'debug' ? [process.stdout] : [],
    },
    info: {
      stream: level === 'info' ? [process.stdout] : [],
    },
    warn: {
      stream: level === 'info' ? [process.stdout] : [],
    },
  },
});

module.exports = logger;
