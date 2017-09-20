// npm packages
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const uuid = require('uuid');
const {spawn} = require('child_process');

// our packages
const {tempDockerDir, getProjectConfig, writeStatus} = require('../../util');

// compose file path
const composePath = path.join(tempDockerDir, 'docker-compose.yml');

exports.hasCompose = () => {
  // if project already has docker-compose - just exit
  try {
    fs.readFileSync(composePath);
    return true;
  } catch (e) {
    return false;
  }
};

exports.updateCompose = ({username}) => {
  // get project info
  const config = getProjectConfig();

  // generate name
  const baseName = `exo-${_.kebabCase(username)}-${_.kebabCase(config.name.split(':').shift())}`;
  const uid = uuid.v1();

  // read compose file
  const compose = yaml.safeLoad(fs.readFileSync(composePath, 'utf8'));

  // modify networks
  compose.networks = Object.assign(
    {},
    {
      exoframe: {
        external: true,
      },
    },
    compose.networks
  );

  // modify services
  Object.keys(compose.services).forEach(svcKey => {
    const name = `${baseName}-${svcKey}-${uid.split('-').shift()}`;
    const backend = `${baseName}-${svcKey}`;
    // update basic settings
    const ext = {
      container_name: name,
      restart: 'on-failure:2',
      networks: ['exoframe', 'default'],
    };
    compose.services[svcKey] = Object.assign({}, ext, compose.services[svcKey]);

    // update labels if needed
    const extLabels = {
      'exoframe.deployment': name,
      'exoframe.user': username,
      'exoframe.project': baseName,
      'traefik.backend': backend,
    };
    compose.services[svcKey].labels = Object.assign({}, extLabels, compose.services[svcKey].labels);
  });

  // write new compose back to file
  fs.writeFileSync(composePath, yaml.safeDump(compose), 'utf8');

  return compose;
};

exports.executeCompose = resultStream =>
  new Promise(resolve => {
    const dc = spawn('docker-compose', ['up', '-d'], {cwd: tempDockerDir});

    dc.stdout.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      writeStatus(resultStream, {message, level: hasError ? 'error' : 'info'});
    });
    dc.stderr.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      writeStatus(resultStream, {message, level: hasError ? 'error' : 'info'});
    });
    dc.on('exit', code => {
      writeStatus(resultStream, {message: `Docker-compose exited with code ${code.toString()}`, level: 'info'});
      resolve(code.toString());
    });
  });
