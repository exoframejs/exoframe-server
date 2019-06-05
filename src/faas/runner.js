const {parentPort, workerData} = require('worker_threads');

const {file} = workerData;

const execute = require(file);

const log = msg => {
  parentPort.postMessage(msg);
};

const main = async () => {
  parentPort.postMessage('Worker starting with:', file);
  const cleanup = await execute(null, {log});
  parentPort.postMessage('Worker started, cleanup:', cleanup);
};

main();
