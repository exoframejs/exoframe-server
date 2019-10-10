// npm modules
const os = require('os');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

// our modules
const {getConfig, waitForConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');
const {pullImage} = require('./util');

// config vars
const baseFolder = path.join(os.homedir(), '.exoframe');
const traefikPath = path.join(baseFolder, 'traefik');

// export traefik init function
exports.initTraefik = async exoNet => {
  await waitForConfig();

  logger.info('Initializing traefik...');
  // get config
  const config = getConfig();

  // check if traefik management is disabled
  if (!config.traefikImage) {
    logger.info('Traefik managment disabled, skipping init..');
    return;
  }

  // build traefik path
  try {
    fs.statSync(traefikPath);
  } catch (e) {
    mkdirp.sync(traefikPath);
  }

  // get all containers
  const allContainers = await docker.listContainers({all: true});
  // try to find traefik instance
  const traefik = allContainers.find(c => c.Names.find(n => n.startsWith(`/${config.traefikName}`)));

  // if traefik exists and running - just return
  if (traefik && !traefik.Status.includes('Exited')) {
    logger.info('Traefik already running, docker init done!');
    return;
  }

  // if container is exited - remove and recreate
  if (traefik && traefik.Status.startsWith('Exited')) {
    logger.info('Exited traefik instance found, re-creating...');
    const traefikContainer = docker.getContainer(traefik.Id);
    // remove
    await traefikContainer.remove();
  }

  // pull image if needed
  const allImages = await docker.listImages();
  const traefikImage = allImages.find(img => img.RepoTags && img.RepoTags.includes(config.traefikImage));
  if (!traefikImage) {
    logger.info('No traefik image found, pulling..');
    const pullLog = await pullImage(config.traefikImage);
    logger.debug(pullLog);
  }

  // debug flags
  const debug = ['--log.level=DEBUG'];

  // letsencrypt flags
  const letsencrypt = [
    '--entryPoints.web.address=:80',
    '--entryPoints.websecure.address=:443',
    `--certificatesResolvers.sample.acme.email=${config.letsencryptEmail}`,
    '--certificatesResolvers.sample.acme.storage=/var/traefik/acme.json',
    '--certificatesResolvers.sample.acme.httpChallenge.entryPoint=web',
  ];

  // construct command
  const Cmd = [
    '--providers.docker',
    '--providers.docker.exposedByDefault=false',
    '--log.filePath=/var/traefik/traefik.log',
    ...(config.letsencrypt ? letsencrypt : []),
    ...(config.debug ? debug : []),
    ...(config.traefikArgs || []),
  ];

  const Labels = {
    'exoframe.deployment': 'exo-traefik',
    'exoframe.user': 'admin',
  };

  const RestartPolicy = {
    Name: 'on-failure',
    MaximumRetryCount: 2,
  };

  // start traefik in docker
  const container = await docker.createContainer({
    Image: config.traefikImage,
    name: config.traefikName,
    Cmd,
    Labels,
    ExposedPorts: {
      '80/tcp': {},
      '443/tcp': {},
    },
    HostConfig: {
      RestartPolicy,
      Binds: ['/var/run/docker.sock:/var/run/docker.sock', `${traefikPath}:/var/traefik`],
      PortBindings: {
        '80/tcp': [{HostPort: '80'}],
        '443/tcp': [{HostPort: '443'}],
      },
    },
  });
  // connect traefik to exoframe net
  await exoNet.connect({
    Container: container.id,
  });
  // start container
  await container.start();
  logger.info('Traefik instance started..');
};
