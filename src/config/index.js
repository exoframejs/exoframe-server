// npm packages
const os = require('os');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');
const {spawn} = require('child_process');

// our packages
const logger = require('../logger');

// construct paths
const baseFolder = path.join(os.homedir(), '.exoframe');
const configPath = path.join(baseFolder, 'server.config.yml');
const publicKeysPath = path.join(os.homedir(), '.ssh');
const extensionsFolder = path.join(baseFolder, 'extensions');
// dir for temporary files used to build docker images
const tempDir = path.join(baseFolder, 'deploying');

// export paths for others
exports.baseFolder = baseFolder;
exports.extensionsFolder = extensionsFolder;
exports.tempDockerDir = tempDir;

// create base folder if doesn't exist
try {
  fs.statSync(baseFolder);
} catch (e) {
  fs.mkdirSync(baseFolder);
}

// create extensions folder if doesn't exist
try {
  fs.statSync(extensionsFolder);
} catch (e) {
  fs.mkdirSync(extensionsFolder);
}
// init package.json if it doesn't exist
try {
  fs.statSync(path.join(extensionsFolder, 'package.json'));
} catch (e) {
  spawn('yarn', ['init', '-y'], {cwd: extensionsFolder});
}

// default config
const defaultConfig = {
  debug: false,
  letsencrypt: false,
  letsencryptEmail: 'admin@domain.com',
  compress: true,
  baseDomain: false,
  cors: false,
  updateChannel: 'stable',
  traefikImage: 'traefik:latest',
  traefikName: 'exoframe-traefik',
  traefikArgs: [],
  exoframeNetwork: 'exoframe',
  exoframeNetworkSwarm: 'exoframe-swarm',
  swarm: false,
  publicKeysPath,
};

// default config
let userConfig = defaultConfig;

// reload function
const reloadUserConfig = async () => {
  // mon
  try {
    userConfig = Object.assign(defaultConfig, yaml.safeLoad(fs.readFileSync(configPath, 'utf8')));
    logger.debug('loaded new config:', userConfig);
  } catch (e) {
    logger.error('error parsing user config:', e);
  }
};

if (process.env.NODE_ENV !== 'testing') {
  // create user config if doesn't exist
  try {
    fs.statSync(configPath);
  } catch (e) {
    fs.writeFileSync(configPath, yaml.safeDump(defaultConfig), 'utf8');
  }

  // monitor config for changes if not running in test mode
  chokidar.watch(configPath).on('all', reloadUserConfig);
}

// function to get latest config read config file
exports.getConfig = () => userConfig;
exports.waitForConfig = reloadUserConfig;
