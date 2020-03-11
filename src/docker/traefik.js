// npm modules
const os = require('os');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const yaml = require('js-yaml');

// our modules
const {getConfig, waitForConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');
const {pullImage} = require('./util');

// config vars
const baseFolder = path.join(os.homedir(), '.exoframe');

async function generateTraefikConfig(config) {
  // letsencrypt flags
  const letsencrypt = {
    entryPoints: {
      websecure: {
        address: ':443',
      },
    },
    certificatesResolvers: {
      exoframeChallenge: {
        acme: {
          httpChallenge: {
            entryPoint: 'web',
          },
          email: config.letsencryptEmail || null,
          storage: '/var/traefik/acme.json',
        },
      },
    },
  };

  let traefikConfig = {
    log: {
      level: config.debug ? 'DEBUG' : 'warning',
      filePath: '/var/traefik/traefik.log',
    },
    entryPoints: {
      web: {
        address: ':80',
      },
    },
    providers: {
      docker: {
        endpoint: 'unix:///var/run/docker.sock',
        exposedByDefault: false,
      },
    },
    ...(config.letsencrypt ? letsencrypt : {}),
  };

  const traefikConfigPath = path.join(baseFolder, 'traefik', 'traefik.yml');

  if (fs.existsSync(traefikConfigPath)) {
    const oldTraefikConfig = yaml.safeLoad(fs.readFileSync(traefikConfigPath, 'utf8'));
    traefikConfig = {...traefikConfig, ...oldTraefikConfig};
  }

  const traefikConfigString = yaml.safeDump(traefikConfig);

  // write new traefik config
  fs.writeFileSync(traefikConfigPath, traefikConfigString);
}

// export traefik init function
exports.initTraefik = async exoNet => {
  await waitForConfig();

  logger.info('Initializing traefik...');
  // get config
  const config = getConfig();

  // check if traefik management is disabled
  if (!config.traefikImage) {
    logger.info('Traefik managment disabled, skipping init.');
    return;
  }

  // build local traefik path
  let traefikPath = path.join(baseFolder, 'traefik');
  let initLocal = true;

  // get all containers
  const allContainers = await docker.listContainers({all: true});
  // find server container
  const server = allContainers.find(c => c.Names.find(n => n.startsWith('/exoframe-server')));
  // if server was found - extract traefik path from it
  if (server) {
    const configVol = (server.Mounts || []).find(v => v.Destination === '/root/.exoframe');
    if (configVol) {
      traefikPath = path.join(configVol.Source, 'traefik');
      logger.info('Running in docker, using existing volume to mount traefik config:', traefikPath);
      initLocal = false;
    }
  }

  // if server volume wasn't found - create local folder if needed
  if (initLocal) {
    try {
      fs.statSync(traefikPath);
    } catch (e) {
      mkdirp.sync(traefikPath);
    }
    logger.info('Running without docker, using local folder for traefik config:', traefikPath);
  }

  // try to find traefik instance
  const traefik = allContainers.find(c => c.Names.find(n => n.startsWith(`/${config.traefikName}`)));

  // generate traefik config
  if (!config.traefikDisableGeneratedConfig) {
    await generateTraefikConfig(config, traefikPath);
  }

  // if traefik exists and running - just return
  if (traefik && !traefik.Status.includes('Exited')) {
    logger.info('Traefik already running. Restarting traefik ...');
    const traefikContainer = docker.getContainer(traefik.Id);
    await traefikContainer.restart();
    logger.info('Docker init done!');
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

  // start traefik in docker
  const container = await docker.createContainer({
    Image: config.traefikImage,
    name: config.traefikName,
    Cmd: '--configFile=/var/traefik/traefik.yml',
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
