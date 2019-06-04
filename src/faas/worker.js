const path = require('path');
const {Worker} = require('worker_threads');
const logger = require('../logger');

module.exports = funMeta => {
  logger.debug('execute in worker', funMeta);
  const file = path.join(funMeta.folder, 'index.js');
  const runner = path.join(__dirname, 'runner.js');
  const worker = new Worker(runner, {
    workerData: {file},
  });
  worker.on('message', msg => logger.debug('Message from worker:', msg));
  worker.on('error', err => logger.error('Error from worker:', err));
  worker.on('exit', code => {
    logger.debug(`Worker stopped with exit code ${code}`);
  });
  return worker;
};
