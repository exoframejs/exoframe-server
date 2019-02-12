const docker = require('./docker');

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
