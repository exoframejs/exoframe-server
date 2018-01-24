// our modules
const docker = require('./docker');
const {initNetwork} = require('../docker/init');
const {getProjectConfig, baseNameFromImage, nameFromImage, projectFromConfig, writeStatus} = require('../util');
const {getConfig} = require('../config');

module.exports = async ({image, username, resultStream}) => {
  const baseName = baseNameFromImage(image);
  const name = nameFromImage(image);

  // get server config
  const serverConfig = getConfig();

  // get project info
  const config = getProjectConfig();

  // generate host
  const defaultDomain = serverConfig.baseDomain ? `${name}${serverConfig.baseDomain}` : undefined;
  const host = config.domain === undefined ? defaultDomain : config.domain;

  // generate env vars
  const Env = config.env ? Object.keys(config.env).map(key => `${key}=${config.env[key]}`) : [];

  // generate project name
  const project = projectFromConfig({username, config});

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
  const additionalLabels = config.labels || {};

  // create config
  const containerConfig = {
    Image: image,
    name,
    Env,
    Labels: Object.assign({}, additionalLabels, {
      'exoframe.deployment': name,
      'exoframe.user': username,
      'exoframe.project': project,
      'traefik.backend': baseName,
    }),
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

  writeStatus(resultStream, {message: 'Starting container with following config:', containerConfig, level: 'verbose'});

  // create container
  const container = await docker.createContainer(containerConfig);

  // connect container to exoframe network
  const exoNet = await initNetwork();
  await exoNet.connect({
    Container: container.id,
  });

  // start container
  await container.start();

  writeStatus(resultStream, {message: 'Container successfully started!', level: 'verbose'});

  return container.inspect();
};
