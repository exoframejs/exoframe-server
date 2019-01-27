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

// config vars
const baseFolder = path.join(os.homedir(), '.exoframe');

// pull image
const pullImage = tag =>
  new Promise(async (resolve, reject) => {
    let log = '';

    const auth = {
      username: 'username',
      password: 'password',
      auth: '',
      email: 'your@email.email',
      serveraddress: 'https://some.private.registry'
    };
    
    const authConfig = auth ? {'authconfig': auth} : undefined;

    docker.pull(tag, authConfig, (err, stream) => {
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

// join swarm network
const joinSwarmNetwork = async config => {
  if (!config.swarm) {
    logger.debug('Not running in swarm, no need to join network..');
    return;
  }

  const allServices = await docker.listServices();
  // try to find traefik instance
  const exoframeServer = allServices.find(c => c.Spec.Name.startsWith('exoframe-server'));
  // if server found - we're running as docker container
  if (exoframeServer) {
    const instance = docker.getService(exoframeServer.ID);
    const instanceInfo = await instance.inspect();
    if (instanceInfo.Spec.Networks && instanceInfo.Spec.Networks.find(n => n.Target === config.exoframeNetworkSwarm)) {
      logger.debug('Already joined swarm network, done.');
      return;
    }
    logger.debug('Not joined swarm network, updating..');
    await instance.update({
      Name: instanceInfo.Spec.Name,
      version: parseInt(instanceInfo.Version.Index, 10),
      Labels: instanceInfo.Spec.Labels,
      TaskTemplate: Object.assign({}, instanceInfo.Spec.TaskTemplate, {
        Networks: [
          {
            Target: config.exoframeNetworkSwarm,
          },
        ],
      }),
      Networks: [
        {
          Target: config.exoframeNetworkSwarm,
        },
      ],
    });
  }
};

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

  // get all containers
  const allContainers = await docker.listContainers({all: true});
  // try to find traefik instance
  const traefik = allContainers.find(c => c.Names.find(n => n.startsWith(`/${config.traefikName}`)));

  // if traefik exists and running - just return
  if (traefik && !traefik.Status.includes('Exited')) {
    logger.info('Traefik already running, docker init done!');
    joinSwarmNetwork(config);
    return;
  }

  // if container is exited - remove and recreate
  if (traefik && traefik.Status.startsWith('Exited')) {
    logger.info('Exited traefik instance found, re-creating...');
    const traefikContainer = docker.getContainer(traefik.Id);
    // remove
    await traefikContainer.remove();
  }

  // build acme path
  const acmePath = path.join(baseFolder, 'traefik', 'acme');
  try {
    fs.statSync(acmePath);
  } catch (e) {
    mkdirp.sync(acmePath);
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
    ...(config.swarm ? ['--docker.swarmmode'] : []),
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

  // if running in swarm mode - run traefik as swarm service
  if (config.swarm) {
    await docker.createService({
      Name: config.traefikName,
      TaskTemplate: {
        ContainerSpec: {
          Image: config.traefikImage,
          Args: Cmd,
          Labels,
          Mounts: [
            {
              Source: '/var/run/docker.sock',
              Target: '/var/run/docker.sock',
              Type: 'bind',
            },
          ],
        },
        Resources: {
          Limits: {},
          Reservations: {},
        },
        RestartPolicy,
        Placement: {
          Constraints: ['node.role==manager'],
        },
      },
      EndpointSpec: {
        Ports: [
          {
            Protocol: 'tcp',
            PublishedPort: 80,
            TargetPort: 80,
          },
          {
            Protocol: 'tcp',
            PublishedPort: 443,
            TargetPort: 443,
          },
        ],
      },
      Mode: {
        Replicated: {
          Replicas: 1,
        },
      },
      UpdateConfig: {
        Parallelism: 1,
      },
      Networks: [
        {
          Target: config.exoframeNetworkSwarm,
        },
      ],
    });

    logger.info('Traefik instance started..');
    // apply auto network join in case we're running in a container
    joinSwarmNetwork(config);
    return;
  }

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
