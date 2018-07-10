const winston = require('winston');

// get format functions
const {
  format: {combine, prettyPrint, timestamp, label, colorize, printf},
} = winston;

// prepare level
const levelTesting = process.env.NODE_ENV === 'testing' ? 'error' : false;
const level = levelTesting || process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// log formatting function
const myFormat = printf(info => `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`);

const logger = winston.createLogger({
  format: combine(timestamp(), colorize(), prettyPrint(), label({label: 'exoframe-server'}), myFormat),
  transports: [new winston.transports.Console({level})],
});

module.exports = logger;
