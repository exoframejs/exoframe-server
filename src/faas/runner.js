const {parentPort, workerData} = require('worker_threads');

const {file} = workerData;

const execute = require(file);

const main = async () => {
  parentPort.postMessage('Worker starting with:', file);
  const cleanup = await execute();
  parentPort.postMessage('Worker started, cleanup:', cleanup);
};

main();
