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

// export default function
module.exports = async () => {
  logger.info('Initializing docker services...');
  // get all containers
  const allContainers = await docker.listContainers({all: true});
  // try to find traefik instance
  const traefik = allContainers.find(
    c =>
      c.Image === 'traefik:latest' && c.Names.find(n => n === `/${traefikName}`)
  );

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

  // get config
  const config = getConfig();
  // build acme path
  const acmePath = path.join(baseFolder, 'traefik', 'acme');
  try {
    fs.statSync(acmePath);
  } catch (e) {
    mkdirp.sync(acmePath);
  }

  // debug flags
  const debug = ['--debug', '--logLevel=DEBUG'];

  // letsencrypt flags
  const letsencrypt = [
    '--acme',
    `--acme.email=${config.letsencryptEmail}`,
    '--acme.storage=/var/acme/acme.json',
    '--acme.entrypoint=https',
    '--acme.ondemand=true',
    '--acme.onhostrule=true',
    '--accesslogsfile=/var/acme/access.log',
    '--entryPoints=Name:https Address::443 TLS',
    '--entryPoints=Name:http Address::80',
  ];

  // construct command
  const Cmd = [
    'traefik',
    '-c /dev/null',
    '--docker',
    ...(config.letsencrypt ? letsencrypt : []),
    ...(config.debug ? debug : []),
  ];

  // start traefik
  const container = await docker.createContainer({
    Image: 'traefik:latest',
    name: traefikName,
    Cmd,
    Labels: {
      'exoframe.deployment': 'ex-traefik',
      'exoframe.user': 'admin',
    },
    HostConfig: {
      RestartPolicy: {
        Name: 'always',
      },
      Binds: [
        '/var/run/docker.sock:/var/run/docker.sock',
        `${acmePath}:/var/acme`,
      ],
      PortBindings: {
        '80/tcp': [{HostPort: '80'}],
        '443/tcp': [{HostPost: '443'}],
      },
    },
  });
  await container.start();
  logger.info('Traefik instance started..');
};
