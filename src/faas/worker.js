const path = require('path');
const {Worker} = require('worker_threads');
const logger = require('../logger');

module.exports = ({meta, log}) => {
  logger.debug('execute in worker', meta);
  const file = path.join(meta.folder, 'index.js');
  const runner = path.join(__dirname, 'runner.js');
  const worker = new Worker(runner, {
    workerData: {file},
  });
  worker.on('message', msg => {
    log(msg);
    logger.debug('Message from function worker:', msg);
  });
  worker.on('error', err => {
    log(err);
    logger.error('Error from function worker:', err);
  });
  worker.on('exit', code => {
    logger.debug(`Worker stopped with exit code ${code}`);
  });
  return worker;
};
