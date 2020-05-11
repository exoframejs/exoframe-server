const docker = require('./docker');
const logger = require('../logger');

exports.removeContainer = async containerInfo => {
  const service = docker.getContainer(containerInfo.Id);
  try {
    await service.remove({force: true});
  } catch (e) {
    // ignore not found errors
    if (e.statusCode === 404) {
      return;
    }
    throw e;
  }
};

// asynchronously pulls docker image
// returns log after finished
exports.pullImage = tag =>
  new Promise(async (resolve, reject) => {
    let log = '';
    docker.pull(tag, (err, stream) => {
      if (err) {
        logger.error('Error pulling:', err);
        reject(err);
        return;
      }
      stream.on('data', d => {
        const line = d.toString();
        log += line;
      });
      stream.once('end', () => resolve(log));
    });
  });

// prunes builder cache, unused images and volumes
exports.pruneDocker = async () => {
  // TODO: re-enable pruneBuilder once fixed in dockerode
  // await docker.pruneBuilder();
  const result = await Promise.all([docker.pruneImages(), docker.pruneVolumes()]);
  return result;
};
