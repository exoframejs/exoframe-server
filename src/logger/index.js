const {Signale} = require('signale');

// prepare level
const levelTesting = process.env.NODE_ENV === 'testing' ? 'error' : false;
const level = levelTesting || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');

const logger = new Signale({
  scope: 'exoframe-server',
  logLevel: level,
  types: {
    // override info type to show it in warn logging
    info: {
      logLevel: 'warn',
    },
  },
});

module.exports = logger;
