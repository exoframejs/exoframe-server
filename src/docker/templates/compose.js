// npm packages
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const uuid = require('uuid');
const {spawn} = require('child_process');

// async simple sleep function
const sleep = time => new Promise(r => setTimeout(r, time));

// default project prefix
const defaultProjectPrefix = 'exo';

// generates new base name for deployment
const generateBaseName = ({username, config}) =>
  `exo-${_.kebabCase(username)}-${_.kebabCase(config.name.split(':').shift())}`;

// function to update compose file with required vars
const updateCompose = ({username, baseName, serverConfig, composePath, util, resultStream}) => {
  const uid = uuid.v1();

  // read compose file
  const compose = yaml.safeLoad(fs.readFileSync(composePath, 'utf8'));

  if (serverConfig.swarm && typeof compose.version === 'string' && !compose.version.startsWith('3')) {
    util.logger.debug('Compose file should be of version 3!');
    util.writeStatus(resultStream, {
      message: 'Running in swarm mode, can only deploy docker-compose file of version 3!',
      data: compose,
      level: 'error',
    });
    resultStream.end('');
    return false;
  }

  // modify networks
  const network = serverConfig.swarm ? serverConfig.exoframeNetworkSwarm : serverConfig.exoframeNetwork;
  compose.networks = Object.assign(
    {},
    {
      [network]: {
        external: true,
      },
    },
    compose.networks
  );

  // modify services
  Object.keys(compose.services).forEach(svcKey => {
    const name = `${baseName}-${svcKey}-${uid.split('-').shift()}`;
    const backend = `${baseName}-${svcKey}`;
    const networks = Array.from(new Set([network, ...(compose.services[svcKey].networks || ['default'])]));
    // update basic settings
    const ext = {
      container_name: name,
      restart: 'on-failure:2',
    };
    compose.services[svcKey] = Object.assign({}, ext, compose.services[svcKey], {networks});

    // update labels if needed
    const extLabels = {
      'exoframe.name': name,
      'exoframe.deployment': name,
      'exoframe.user': username,
      'exoframe.project': baseName,
      'traefik.port': '80',
      'traefik.backend': backend,
      'traefik.docker.network': network,
      'traefik.enable': 'true',
    };
    if (serverConfig.swarm) {
      if (!compose.services[svcKey].deploy) {
        compose.services[svcKey].deploy = {};
      }
      compose.services[svcKey].deploy.labels = Object.assign(
        {},
        extLabels,
        compose.services[svcKey].deploy.labels || {}
      );
    } else {
      compose.services[svcKey].labels = Object.assign({}, extLabels, compose.services[svcKey].labels);
    }
  });

  // write new compose back to file
  fs.writeFileSync(composePath, yaml.safeDump(compose), 'utf8');

  return compose;
};

// function to update compose file with pre-built images for stack deploy
const updateComposeForStack = ({composePath, images}) => {
  // read compose file
  const compose = yaml.safeLoad(fs.readFileSync(composePath, 'utf8'));

  // modify services
  Object.keys(compose.services).forEach(svcKey => {
    // if service has build entry, replace it with image
    if (compose.services[svcKey].build) {
      delete compose.services[svcKey].build;
      compose.services[svcKey].image = images.find(image => image === `${defaultProjectPrefix}_${svcKey}:latest`);
    }
  });

  // write new compose back to file
  fs.writeFileSync(composePath, yaml.safeDump(compose), 'utf8');

  return compose;
};

// extract pre-built image names from build log
const logToImages = log =>
  log
    .filter(line => line.startsWith('Successfully tagged'))
    .map(line => line.replace(/^Successfully tagged /, '').trim());

// function to execute docker-compose file and return the output
const executeCompose = ({cmd, resultStream, tempDockerDir, writeStatus}) =>
  new Promise(resolve => {
    const dc = spawn('docker-compose', cmd, {cwd: tempDockerDir});
    const log = [];

    dc.stdout.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      log.push(message);
      writeStatus(resultStream, {message, level: hasError ? 'error' : 'info'});
    });
    dc.stderr.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      log.push(message);
      writeStatus(resultStream, {message, level: hasError ? 'error' : 'info'});
    });
    dc.on('exit', code => {
      writeStatus(resultStream, {message: `Docker-compose exited with code ${code.toString()}`, level: 'info'});
      resolve({code: code.toString(), log});
    });
  });

// function to execute docker stack deploy using compose file and return the output
const executeStack = ({cmd, resultStream, tempDockerDir, writeStatus}) =>
  new Promise(resolve => {
    const dc = spawn('docker', cmd, {cwd: tempDockerDir});

    dc.stdout.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error') || message.toLowerCase().includes('failed');
      writeStatus(resultStream, {message, level: hasError ? 'error' : 'info'});
    });
    dc.stderr.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error') || message.toLowerCase().includes('failed');
      writeStatus(resultStream, {message, level: hasError ? 'error' : 'info'});
    });
    dc.on('exit', code => {
      writeStatus(resultStream, {message: `Docker stack deploy exited with code ${code.toString()}`, level: 'info'});
      resolve(code.toString());
    });
  });

// template name
exports.name = 'docker-compose';

// function to check if the template fits this recipe
exports.checkTemplate = async ({tempDockerDir}) => {
  // compose file path
  const composePath = path.join(tempDockerDir, 'docker-compose.yml');
  // if project already has docker-compose - just exit
  try {
    fs.readFileSync(composePath);
    return true;
  } catch (e) {
    return false;
  }
};

// function to execute current template
exports.executeTemplate = async ({username, config, serverConfig, tempDockerDir, resultStream, docker, util}) => {
  // compose file path
  const composePath = path.join(tempDockerDir, 'docker-compose.yml');
  // if it does - run compose workflow
  util.logger.debug('Docker-compose file found, executing compose workflow..');
  util.writeStatus(resultStream, {message: 'Deploying docker-compose project..', level: 'info'});

  // generate basename
  const baseName = generateBaseName({username, config});

  // update compose file with project params
  const composeConfig = updateCompose({username, baseName, config, serverConfig, composePath, util, resultStream});
  // exit if update failed
  if (!composeConfig) {
    return;
  }
  util.logger.debug('Compose modified:', composeConfig);
  util.writeStatus(resultStream, {message: 'Compose file modified', data: composeConfig, level: 'verbose'});

  // re-build images if needed
  const {code: buildExitCode, log: buildLog} = await executeCompose({
    cmd: ['--project-name', defaultProjectPrefix, 'build'],
    resultStream,
    tempDockerDir,
    writeStatus: util.writeStatus,
  });
  util.logger.debug('Compose build executed, exit code:', buildExitCode);

  // if running in swarm mode - execute using docker stack
  if (serverConfig.swarm) {
    // update docker-compose to include pre-built images
    const images = logToImages(buildLog);
    const stackCompose = await updateComposeForStack({composePath, images});
    util.logger.debug('Compose modified for stack deployment:', stackCompose);
    util.writeStatus(resultStream, {
      message: 'Compose file modified for stack deploy',
      data: stackCompose,
      level: 'verbose',
    });

    // execute stack deploy
    const exitCode = await executeStack({
      cmd: ['stack', 'deploy', '-c', 'docker-compose.yml', baseName],
      resultStream,
      tempDockerDir,
      writeStatus: util.writeStatus,
    });
    util.logger.debug('Stack deploy executed, exit code:', exitCode);
    if (exitCode !== '0') {
      // return them
      util.writeStatus(resultStream, {message: 'Deployment failed!', exitCode, level: 'error'});
      resultStream.end('');
      return;
    }

    // get service name labels from config
    const serviceNames = Object.keys(composeConfig.services).map(
      svc => composeConfig.services[svc].deploy.labels['exoframe.name']
    );

    // wait for stack to deploy
    while (true) {
      // get services info
      const allServices = await docker.daemon.listServices();
      const startedServices = serviceNames
        .map(name => allServices.find(c => c.Spec.Labels['exoframe.name'] === name))
        .filter(s => !!s);
      if (startedServices.length === serviceNames.length) {
        break;
      }
      await sleep(1000);
    }

    // get services info
    const allServices = await docker.daemon.listServices();
    const deployments = await Promise.all(
      serviceNames
        .map(name => allServices.find(c => c.Spec.Labels['exoframe.name'] === name))
        .map(info => docker.daemon.getService(info.ID))
        .map(service => service.inspect())
    );
    // return them
    util.writeStatus(resultStream, {message: 'Deployment success!', deployments, level: 'info'});
    resultStream.end('');
    return;
  }

  // execute compose 'up -d'
  const exitCode = await executeCompose({
    cmd: ['--project-name', defaultProjectPrefix, 'up', '-d'],
    resultStream,
    tempDockerDir,
    writeStatus: util.writeStatus,
  });
  util.logger.debug('Compose up executed, exit code:', exitCode);

  // get container infos
  const allContainers = await docker.daemon.listContainers({all: true});
  const deployments = await Promise.all(
    Object.keys(composeConfig.services)
      .map(svc => composeConfig.services[svc].container_name)
      .map(name => allContainers.find(c => c.Names.find(n => n === `/${name}`)))
      .map(info => docker.daemon.getContainer(info.Id))
      .map(container => container.inspect())
  );
  // return them
  util.writeStatus(resultStream, {message: 'Deployment success!', deployments, level: 'info'});
  resultStream.end('');
};
