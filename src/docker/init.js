// npm modules
const os = require('os');
const path = require('path');

// our modules
const docker = require('./docker');
const logger = require('../logger');

// config vars
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

  // if traefik exists - just return
  if (traefik) {
    logger.info('Traefik already running, docker init done!');
    return;
  }

  // start traefik
  const container = await docker.createContainer({
    Image: 'traefik:latest',
    name: traefikName,
    Cmd: ['traefik', '-c /dev/null', '--docker', '--logLevel=DEBUG'],
    Labels: {
      'exoframe.deployment': 'ex-traefik',
      'exoframe.user': 'admin',
    },
    HostConfig: {
      RestartPolicy: {
        Name: 'always',
      },
      Binds: [`/var/run/docker.sock:/var/run/docker.sock`],
      PortBindings: {
        '80/tcp': [{HostPort: '80'}],
      },
    },
  });
  await container.start();
  logger.info('Traefik instance started..');
};
