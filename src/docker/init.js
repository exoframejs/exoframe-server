// npm modules
const os = require('os');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

// our modules
const {getConfig, waitForConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');
const {initNetwork} = require('./network');
const {getPlugins} = require('../plugins');

// config vars
const baseFolder = path.join(os.homedir(), '.exoframe');

const getDockerAuthentication = tag => {
  let authconfig = undefined;
  const configFile = `${process.env.HOME}/.docker/config.json`;

  if (fs.existsSync(configFile)) {
    const authFileContent = fs.readFileSync(configFile);
    const authJson = JSON.parse(authFileContent.toString());
    const hostName = tag.substr(0, tag.indexOf('/'));

    if (authJson.auths[hostName] && authJson.auths[hostName].auth) {
      const details = new Buffer.from(authJson.auths[hostName].auth, 'base64').toString('ascii').split(':');

      authconfig = {
        'serveraddress': hostName,
        'username': details[0],
        'password': details[1]
      };
    }
  }
  return authconfig
}

exports.getDockerAuthentication = getDockerAuthentication

// pull image
const pullImage = tag =>
  new Promise(async (resolve, reject) => {
    let log = '';
    docker.pull(tag, {
      authconfig: getDockerAuthentication(tag)
    }, (err, stream) => {
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

// export default function
exports.initDocker = async () => {
  await waitForConfig();

  logger.info('Initializing docker services...');
  // create exoframe network if needed
  const exoNet = await initNetwork();

  // get config
  const config = getConfig();

  // check if traefik management is disabled
  if (!config.traefikImage) {
    logger.info('Traefik managment disabled, skipping init..');
    return;
  }

  // build acme path
  const acmePath = path.join(baseFolder, 'traefik', 'acme');
  try {
    fs.statSync(acmePath);
  } catch (e) {
    mkdirp.sync(acmePath);
  }

  // run init via plugins if available
  const plugins = getPlugins();
  logger.debug('Got plugins, running init:', plugins);
  for (const plugin of plugins) {
    // only run plugins that have init function
    if (!plugin.init) {
      continue;
    }

    const result = await plugin.init({config, logger, docker});
    logger.debug('Initing traefik with plugin:', plugin.config.name, result);
    if (result && plugin.config.exclusive) {
      logger.info('Init finished via exclusive plugin:', plugin.config.name);
      return;
    }
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
  const debug = ['--debug', '--logLevel=DEBUG'];

  // letsencrypt flags
  const letsencrypt = [
    '--acme',
    `--acme.email=${config.letsencryptEmail}`,
    '--acme.storage=/var/acme/acme.json',
    '--acme.httpchallenge.entrypoint=http',
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
    '--docker.watch',
    ...(config.letsencrypt ? letsencrypt : entrypoints),
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
