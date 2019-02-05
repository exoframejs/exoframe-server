// our modules
const docker = require('./docker');
const {initNetwork, createNetwork} = require('../docker/network');
const {getProjectConfig, nameFromImage, projectFromConfig, writeStatus} = require('../util');
const {getSecretsCollection} = require('../db/secrets');
const {getConfig} = require('../config');
const {getPlugins} = require('../plugins');
const logger = require('../logger');

// try to find secret with current value name and return secret value if present
const valueOrSecret = (value, secrets) => {
  const secret = secrets.find(s => `@${s.name}` === value);
  if (secret) {
    return secret.value;
  }
  return value;
};

exports.startFromParams = async ({
  image,
  deploymentName,
  projectName,
  username,
  backendName,
  frontend,
  hostname,
  restartPolicy,
  Env = [],
  additionalLabels = {},
  Mounts = [],
  additionalNetworks = [],
}) => {
  const name = deploymentName || nameFromImage(image);
  const backend = backendName || name;

  // get server config
  const serverConfig = getConfig();

  // construct restart policy
  let RestartPolicy = {};
  const Name = ['no', 'on-failure', 'always'].find(c => c.startsWith(restartPolicy));
  RestartPolicy = {
    Name,
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

  // construct backend name from host (if available) or name
  const Labels = Object.assign({}, additionalLabels, {
    'exoframe.deployment': name,
    'exoframe.user': username,
    'exoframe.project': projectName,
    'traefik.backend': backend,
    'traefik.docker.network': serverConfig.exoframeNetwork,
    'traefik.enable': 'true',
  });

  // if host is set - add it to config
  if (frontend && frontend.length) {
    Labels['traefik.frontend.rule'] = frontend;
  }

  // run startFromParams via plugins if available
  const plugins = getPlugins();
  logger.debug('Got plugins, running startFromParams:', plugins);
  for (const plugin of plugins) {
    // only run plugins that have startFromParams function
    if (!plugin.startFromParams) {
      continue;
    }

    const result = await plugin.startFromParams({
      docker,
      serverConfig,
      name,
      image,
      deploymentName,
      projectName,
      username,
      backendName,
      frontend,
      hostname,
      restartPolicy,
      serviceLabels: Labels,
      Env,
      Mounts,
      additionalNetworks,
    });
    logger.debug('Executed startWithParams with plugin:', plugin.config.name, result);
    if (result && plugin.config.exclusive) {
      logger.debug('StartWithParams finished via exclusive plugin:', plugin.config.name);
      return result;
    }
  }

  // create config
  const containerConfig = {
    Image: image,
    name,
    Env,
    Labels,
    HostConfig: {
      RestartPolicy,
      Mounts,
    },
  };

  if (hostname && hostname.length) {
    containerConfig.NetworkingConfig = {
      EndpointsConfig: {
        exoframe: {
          Aliases: [hostname],
        },
      },
    };
  }

  // create container
  const container = await docker.createContainer(containerConfig);

  // connect container to exoframe network
  const exoNet = await initNetwork();
  await exoNet.connect({
    Container: container.id,
  });

  // connect to additional networks if any
  await Promise.all(
    additionalNetworks.map(async netName => {
      const net = await createNetwork(netName);
      await net.connect({Container: container.id});
    })
  );

  // start container
  await container.start();

  const containerInfo = await container.inspect();
  const containerData = docker.getContainer(containerInfo.Id);
  return containerData.inspect();
};

exports.start = async ({image, username, folder, resultStream, existing = []}) => {
  const name = nameFromImage(image);

  // get server config
  const serverConfig = getConfig();

  // get project info
  const config = getProjectConfig(folder);

  // generate host
  // construct base domain from config, prepend with "." if it's not there
  const baseDomain = serverConfig.baseDomain ? serverConfig.baseDomain.replace(/^(\.?)/, '.') : undefined;
  // construc default domain using given base domain
  const defaultDomain = baseDomain ? `${name}${baseDomain}` : undefined;
  // construct host
  const host = config.domain === undefined ? defaultDomain : config.domain;

  // replace env vars values with secrets if needed
  const secrets = getSecretsCollection().find({user: username});
  // generate env vars (with secrets)
  const Env = config.env ? Object.keys(config.env).map(key => `${key}=${valueOrSecret(config.env[key], secrets)}`) : [];

  // generate project name
  const project = projectFromConfig({username, config});

  // construct restart policy
  let RestartPolicy = {};
  const restartPolicy = config.restart || 'on-failure:2';
  const Name = ['no', 'on-failure', 'always'].find(c => c.startsWith(restartPolicy));
  RestartPolicy = {
    Name,
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

  // construct backend name from host (if available) or name
  const backend = host && host.length ? host : name;

  const Labels = Object.assign({}, additionalLabels, {
    'exoframe.deployment': name,
    'exoframe.user': username,
    'exoframe.project': project,
    'traefik.backend': backend,
    'traefik.docker.network': serverConfig.exoframeNetwork,
    'traefik.enable': 'true',
  });

  // if host is set - add it to config
  if (host && host.length) {
    Labels['traefik.frontend.rule'] = `Host:${host}`;
  }

  // if rate-limit is set - add it to config
  if (config.rateLimit) {
    // we're using IP-based rate-limit
    Labels['traefik.frontend.rateLimit.extractorFunc'] = 'client.ip';
    // set values from project config
    Labels['traefik.frontend.rateLimit.rateSet.exo.period'] = config.rateLimit.period;
    Labels['traefik.frontend.rateLimit.rateSet.exo.average'] = String(config.rateLimit.average);
    Labels['traefik.frontend.rateLimit.rateSet.exo.burst'] = String(config.rateLimit.burst);
  }

  // if basic auth is set - add it to config
  if (config.basicAuth && config.basicAuth.length) {
    Labels['traefik.frontend.auth.basic.users'] = config.basicAuth;
  }

  // run startFromParams via plugins if available
  const plugins = getPlugins();
  logger.debug('Got plugins, running start:', plugins);
  for (const plugin of plugins) {
    // only run plugins that have startFromParams function
    if (!plugin.start) {
      continue;
    }

    const result = await plugin.start({
      config,
      serverConfig,
      project,
      username,
      name,
      image,
      Env,
      serviceLabels: Labels,
      writeStatus,
      resultStream,
      docker,
    });
    logger.debug('Executed start with plugin:', plugin.config.name, result);
    if (result && plugin.config.exclusive) {
      logger.debug('Start finished via exclusive plugin:', plugin.config.name);
      return result;
    }
  }

  // create config
  const containerConfig = {
    Image: image,
    name,
    Env,
    Labels,
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

  const containerInfo = await container.inspect();
  const containerData = docker.getContainer(containerInfo.Id);
  return containerData.inspect();
};
