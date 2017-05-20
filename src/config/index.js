// npm packages
const os = require('os');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');

// our packages
const logger = require('../logger');

// construct paths
const baseFolder = path.join(os.homedir(), '.exoframe');
const configPath = path.join(baseFolder, 'server.config.yml');

// create base folder if doesn't exist
try {
  fs.statSync(baseFolder);
} catch (e) {
  fs.mkdirSync(baseFolder);
}

// default config
const defaultConfig = {
  debug: false,
  letsencrypt: false,
  letsencryptEmail: 'admin@domain.com',
  baseDomain: false,
  users: [
    {
      username: 'admin',
      password: 'admin',
      admin: true,
    },
  ],
};

// default config
let userConfig = defaultConfig;

// reload function
const reloadUserConfig = async () => {
  // mon
  try {
    userConfig = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
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
