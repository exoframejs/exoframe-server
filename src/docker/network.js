// our modules
const {getConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');

const initDockerNetwork = async config => {
  const nets = await docker.listNetworks();
  let exoNet = nets.find(n => n.Name === config.exoframeNetwork);
  if (!exoNet) {
    logger.info(`Exoframe network ${config.exoframeNetwork} does not exists, creating...`);
    exoNet = await docker.createNetwork({
      Name: config.exoframeNetwork,
      Driver: 'bridge',
    });
  } else {
    exoNet = docker.getNetwork(exoNet.Id);
  }

  return exoNet;
};

const initSwarmNetwork = async config => {
  const nets = await docker.listNetworks();
  let exoNet = nets.find(n => n.Name === config.exoframeNetworkSwarm);
  if (!exoNet) {
    logger.info(`Exoframe network ${config.exoframeNetworkSwarm} does not exists, creating...`);
    exoNet = await docker.createNetwork({
      Name: config.exoframeNetworkSwarm,
      Driver: 'overlay',
    });
  } else {
    exoNet = docker.getNetwork(exoNet.Id);
  }

  return exoNet;
};

// create exoframe network if needed
const initNetwork = async () => {
  // get config
  const config = getConfig();
  if (config.swarm) {
    return initSwarmNetwork(config);
  }

  return initDockerNetwork(config);
};
exports.initNetwork = initNetwork;
