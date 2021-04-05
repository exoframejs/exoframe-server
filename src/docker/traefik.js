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

function getTraefikPath(volumePath) {
  return path.join(volumePath, 'traefik');
}

function getInternalTraefikPath(volumePath) {
  return path.join(volumePath, '.internal', 'traefik');
}

async function generateTraefikConfig(config, volumePath) {
  // letsencrypt flags
  const letsencrypt = {
    entryPoints: {
      web: {
        address: ':80',
      },
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

  // load user definend config
  const traefikCustomConfigPath = path.join(getTraefikPath(volumePath), 'traefik.yml');
  if (fs.existsSync(traefikCustomConfigPath)) {
    logger.info('Using custom traefik config:', traefikCustomConfigPath);

    const traefikCustomConfig = yaml.safeLoad(fs.readFileSync(traefikCustomConfigPath, 'utf8'));

    // merge custom
    traefikConfig = {...traefikConfig, ...traefikCustomConfig};
  }

  // create internal traefik config folder
  try {
    fs.statSync(getInternalTraefikPath(volumePath));
  } catch (e) {
    mkdirp.sync(getInternalTraefikPath(volumePath));
  }

  // write new generated traefik config
  const generatedTraefikConfigPath = path.join(getInternalTraefikPath(volumePath), 'traefik.yml');
  fs.writeFileSync(generatedTraefikConfigPath, yaml.safeDump(traefikConfig));
}

// export traefik init function
exports.initTraefik = async exoNet => {
  await waitForConfig();

  logger.info('Initializing traefik ...');
  // get config
  const config = getConfig();

  // check if traefik management is disabled
  if (!config.traefikImage) {
    logger.info('Traefik managment disabled, skipping init.');
    return;
  }

  // build local traefik path
  let volumePath = baseFolder;
  let initLocal = true;

  // get all containers
  const allContainers = await docker.listContainers({all: true});
  // find server container
  const server = allContainers.find(c => c.Names.find(n => n.startsWith('/exoframe-server')));
  // if server was found - extract traefik path from it
  if (server) {
    const configVol = (server.Mounts || []).find(v => v.Destination === '/root/.exoframe');
    if (configVol) {
      volumePath = configVol.Source;
      logger.info('Server is running inside docker.');
      initLocal = false;
    }
  }

  // if server volume wasn't found - create local folder if needed
  if (initLocal) {
    try {
      fs.statSync(volumePath);
    } catch (e) {
      mkdirp.sync(volumePath);
    }
    logger.info('Server is running without docker.');
  }

  // try to find traefik instance
  const traefik = allContainers.find(c => c.Names.find(n => n.startsWith(`/${config.traefikName}`)));

  // generate traefik config
  if (!config.traefikDisableGeneratedConfig) {
    await generateTraefikConfig(config, baseFolder);
  }

  // if traefik exists and running - restart it to reload config
  if (traefik && !traefik.Status.includes('Exited')) {
    logger.info('Traefik already running. Restarting traefik ...');
    const traefikContainer = docker.getContainer(traefik.Id);
    await traefikContainer.restart();
    logger.info('Docker init done!');
    return;
  }

  // if container is exited - remove and recreate
  if (traefik && traefik.Status.startsWith('Exited')) {
    logger.info('Exited traefik instance found, re-creating ...');
    const traefikContainer = docker.getContainer(traefik.Id);
    // remove
    await traefikContainer.remove();
  }

  // pull image if needed
  const allImages = await docker.listImages();
  const traefikImage = allImages.find(img => img.RepoTags && img.RepoTags.includes(config.traefikImage));
  if (!traefikImage) {
    logger.info('No traefik image found, pulling ...');
    const pullLog = await pullImage(config.traefikImage);
    logger.debug(pullLog);
  }

  // start traefik in docker
  const container = await docker.createContainer({
    Image: config.traefikImage,
    name: config.traefikName,
    Cmd: '--configFile=/var/traefik-config/traefik.yml',
    Labels: {
      'exoframe.deployment': 'exo-traefik',
      'exoframe.user': 'admin',
      ...(config.traefikLabels || {}), // custom traefik labels
    },
    ExposedPorts: {
      '80/tcp': {},
      '443/tcp': {},
      ...Object.fromEntries(Object.keys(config.traefikPorts).map(k => [k, {}])), // custom traefik ports
    },
    HostConfig: {
      RestartPolicy: {
        Name: 'on-failure',
        MaximumRetryCount: 2,
      },
      Binds: [
        '/var/run/docker.sock:/var/run/docker.sock', // docker socket
        `${getInternalTraefikPath(volumePath)}:/var/traefik-config`, // mount generated config
        `${getTraefikPath(volumePath)}:/var/traefik`, // mount folder for traefik.log, acme.json
      ],
      PortBindings: {
        '80/tcp': [{HostPort: '80'}],
        '443/tcp': [{HostPort: '443'}],
        ...(config.traefikPorts || {}), // custom traefik ports
      },
    },
  });

  // connect traefik to exoframe net
  await exoNet.connect({
    Container: container.id,
  });

  // start container
  await container.start();
  logger.info('Traefik instance started ...');
};
