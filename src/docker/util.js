const docker = require('./docker');

exports.removeContainer = async containerInfo => {
  const service = docker.getContainer(containerInfo.Id);
  await service.remove({force: true});
};
