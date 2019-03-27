// npm modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const tar = require('tar-fs');
const rimraf = require('rimraf');
const uuid = require('uuid');
const {getSecretsCollection} = require('../db/secrets');

// our modules
const {tempDockerDir: tempDir} = require('../config');

// try to find secret with current value name and return secret value if present
const valueOrSecret = (value, secrets) => {
  const secret = secrets.find(s => `@${s.name}` === value);
  if (secret) {
    return secret.value;
  }
  return value;
};

// cleanup temp folder
exports.cleanTemp = folder => new Promise(resolve => rimraf(path.join(tempDir, folder), resolve));

// unpack function for incoming project files
exports.unpack = ({tarStream, folder}) =>
  new Promise((resolve, reject) => {
    // create whatever writestream you want
    const s = tarStream.pipe(tar.extract(path.join(tempDir, folder)));
    s.on('finish', () => resolve());
    s.on('error', e => reject(e));
  });

exports.getProjectConfig = folder => {
  const projectConfigString = fs.readFileSync(path.join(tempDir, folder, 'exoframe.json'));
  const config = JSON.parse(projectConfigString);

  return config;
};

exports.tagFromConfig = ({username, config}) => `exo-${_.kebabCase(username)}-${_.kebabCase(config.name)}:latest`;

exports.baseNameFromImage = image =>
  image
    .split(':')
    .shift()
    .replace(/[^a-zA-Z0-9_-]/g, '');

exports.nameFromImage = image => {
  const baseName = exports.baseNameFromImage(image);
  const uid = uuid.v1();
  return `${baseName}-${uid.split('-').shift()}`;
};

exports.projectFromConfig = ({username, config}) => {
  const image = exports.tagFromConfig({username, config});
  const baseName = exports.baseNameFromImage(image);
  return config.project || baseName;
};

exports.sleep = time => new Promise(r => setTimeout(r, time));

exports.writeStatus = (stream, data) => stream.write(`${JSON.stringify(data)}\n`);

exports.runYarn = ({args, cwd}) =>
  new Promise(resolve => {
    const yarn = spawn('yarn', args, {cwd});
    const log = [];
    yarn.stdout.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      log.push({message, level: hasError ? 'error' : 'info'});
    });
    yarn.stderr.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      log.push({message, level: hasError ? 'error' : 'info'});
    });
    yarn.on('exit', code => {
      log.push({message: `yarn exited with code ${code.toString()}`, level: 'info'});
      resolve(log);
    });
  });

exports.compareNames = (nameOne = '', nameTwo = '') => {
  const nameOneParts = nameOne.split('-');
  const nameOneClean = nameOneParts.slice(0, nameOneParts.length - 2).join('-');

  const nameTwoParts = nameTwo.split('-');
  const nameTwoClean = nameTwoParts.slice(0, nameTwoParts.length - 2).join('-');
  return nameOneClean === nameTwoClean;
};

exports.getHost = ({serverConfig, name, config}) => {
  // construct base domain from config, prepend with "." if it's not there
  const baseDomain = serverConfig.baseDomain ? serverConfig.baseDomain.replace(/^(\.?)/, '.') : undefined;
  // construct default domain using given base domain
  const defaultDomain = baseDomain ? `${name}${baseDomain}` : undefined;
  // construct host
  const host = config.domain === undefined ? defaultDomain : config.domain;
  return host;
};

exports.getEnv = ({username, config, name, host, project = config.project || name}) => {
  // replace env vars values with secrets if needed
  const secrets = getSecretsCollection().find({ user: username });
  // generate env vars (with secrets)
  const userEnv = config.env
    ? Object.entries(config.env).map(([key, value]) => [key, valueOrSecret(value, secrets)])
    : [];
  return [
    ...userEnv,
    ['EXOFRAME_DEPLOYMENT', name],
    ['EXOFRAME_USER', username],
    ['EXOFRAME_PROJECT', project],
    ['EXOFRAME_HOST', host],
  ];
};
