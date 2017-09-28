// npm modules
const os = require('os');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

// our modules
const {getConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');

// config vars
const baseFolder = path.join(os.homedir(), '.exoframe');
const traefikName = 'exoframe-traefik';
exports.traefikName = traefikName;

// pull image
const pullImage = tag =>
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
exports.pullImage = pullImage;

// create exoframe network if needed
const initNetwork = async () => {
  const nets = await docker.listNetworks();
  let exoNet = nets.find(n => n.Name === 'exoframe');
  if (!exoNet) {
    logger.info('Exoframe network does not exists, creating...');
    exoNet = await docker.createNetwork({
      Name: 'exoframe',
      Driver: 'bridge',
    });
  } else {
    exoNet = docker.getNetwork(exoNet.Id);
  }

  return exoNet;
};
exports.initNetwork = initNetwork;

// export default function
exports.initDocker = async () => {
  logger.info('Initializing docker services...');
  // get all containers
  const allContainers = await docker.listContainers();
  // try to find traefik instance
  const traefik = allContainers.find(c => c.Names.find(n => n === `/${traefikName}`));

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

  // create exoframe network if needed
  const exoNet = await initNetwork();

  // get config
  const config = getConfig();
  // build acme path
  const acmePath = path.join(baseFolder, 'traefik', 'acme');
  try {
    fs.statSync(acmePath);
  } catch (e) {
    mkdirp.sync(acmePath);
  }

  // pull image if needed
  const allImages = await docker.listImages();
  const traefikImage = allImages.find(img => img.RepoTags && img.RepoTags.includes('traefik:latest'));
  if (!traefikImage) {
    logger.info('No traefik image found, pulling..');
    const pullLog = await pullImage('traefik:latest');
    logger.debug(pullLog);
  }

  // debug flags
  const debug = ['--debug', '--logLevel=DEBUG'];

  // letsencrypt flags
  const letsencrypt = [
    '--acme',
    `--acme.email=${config.letsencryptEmail}`,
    '--acme.storage=/var/acme/acme.json',
    '--acme.entrypoint=https',
    '--acme.onhostrule=true',
    '--accesslogsfile=/var/acme/access.log',
    `--entryPoints=Name:https Address::443 TLS ${config.compress ? 'Compress:on' : 'Compress:off'}`,
    `--entryPoints=Name:http Address::80 Redirect.EntryPoint:https ${config.compress ? 'Compress:on' : 'Compress:off'}`,
    '--defaultEntryPoints=https,http',
  ];

  // entrypoints without letsencrypt
  const entrypoints = [
    `--entryPoints=Name:http Address::80 ${config.compress ? 'Compress:on' : 'Compress:off'}`,
    '--defaultEntryPoints=http',
  ];

  // construct command
  const Cmd = [
    '-c',
    '/dev/null',
    '--docker',
    ...(config.letsencrypt ? letsencrypt : entrypoints),
    ...(config.debug ? debug : []),
  ];

  // start traefik
  const container = await docker.createContainer({
    Image: 'traefik:latest',
    name: traefikName,
    Cmd,
    Labels: {
      'exoframe.deployment': 'exo-traefik',
      'exoframe.user': 'admin',
    },
    ExposedPorts: {
      '80/tcp': {},
      '443/tcp': {},
    },
    HostConfig: {
      RestartPolicy: {
        Name: 'on-failure',
        MaximumRetryCount: 2,
      },
      Binds: ['/var/run/docker.sock:/var/run/docker.sock', `${acmePath}:/var/acme`],
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
