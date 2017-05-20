// npm modules
const uuid = require('uuid');

// our modules
const docker = require('./docker');
const {getProjectConfig} = require('../util');
const {getConfig} = require('../config');

module.exports = async ({image, username}) => {
  const baseName = image.split(':').shift();
  const uid = uuid.v1();
  const name = `${baseName}-${uid.split('-').shift()}`;

  // get server config
  const serverConfig = getConfig();

  // get project info
  const config = getProjectConfig();

  // generate host
  const defaultDomain = serverConfig.baseDomain ? `${name}${serverConfig.baseDomain}` : undefined;
  const host = config.domain || defaultDomain;

  // generate env vars
  const Env = config.env ? Object.keys(config.env).map(key => `${key}=${config.env[key]}`) : [];

  // construct restart policy
  const restartPolicy = config.restart || 'on-failure:2';
  const RestartPolicy = {
    Name: restartPolicy,
  };
  if (restartPolicy.includes('on-failure')) {
    let restartCount = 2;
    try {
      restartCount = parseInt(restartPolicy.split(':')[1], 10);
    } catch (e) {
      // error parsing restart count, using default value
    }
    RestartPolicy.Name = 'on-failure';
    RestartPolicy.MaximumRetryCount = restartCount;
  }

  // create config
  const containerConfig = {
    Image: image,
    name,
    Env,
    Labels: {
      'exoframe.deployment': name,
      'exoframe.user': username,
      'traefik.backend': baseName,
    },
    HostConfig: {
      RestartPolicy,
    },
  };

  if (config.hostname && config.hostname.length) {
    containerConfig.NetworkingConfig = {
      EndpointsConfig: {
        exoframe: {
          Aliases: [config.hostname],
        },
      },
    };
  }

  // if host is set - add it to config
  if (host && host.length) {
    containerConfig.Labels['traefik.frontend.rule'] = `Host:${host}`;
  }

  // create container
  const container = await docker.createContainer(containerConfig);

  // connect container to exoframe network
  const nets = await docker.listNetworks();
  const exoNetInfo = nets.find(n => n.Name === 'exoframe');
  const exoNet = docker.getNetwork(exoNetInfo.Id);
  await exoNet.connect({
    Container: container.id,
  });

  // start container
  await container.start();

  return container.inspect();
};
