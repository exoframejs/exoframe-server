// our modules
const {getConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');

const createDockerNetwork = async networkName => {
  const nets = await docker.listNetworks();
  let exoNet = nets.find(n => n.Name === networkName);
  if (!exoNet) {
    logger.info(`Exoframe network ${networkName} does not exists, creating...`);
    exoNet = await docker.createNetwork({
      Name: networkName,
      Driver: 'bridge',
    });
  } else {
    exoNet = docker.getNetwork(exoNet.Id);
  }

  return exoNet;
};
const initDockerNetwork = async config => createDockerNetwork(config.exoframeNetwork);

// create exoframe network if needed
const initNetwork = async () => {
  // get config
  const config = getConfig();
  return initDockerNetwork(config);
};
exports.initNetwork = initNetwork;

// create network function
const createNetwork = async networkName => {
  return createDockerNetwork(networkName);
};
exports.createNetwork = createNetwork;
