const docker = require('./docker');

exports.removeContainer = async containerInfo => {
  const service = docker.getContainer(containerInfo.Id);
  if (containerInfo.State === 'running') {
    await service.stop();
  }
  await service.remove();
};
