// npm packages
import os from 'os';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chokidar from 'chokidar';

// our packages
import logger from '../logger';

// construct paths
const baseFolder = path.join(os.homedir(), '.exoframe');
const configPath = path.join(baseFolder, 'server.config.yml');

const defaultConfig = {
  users: [{
    username: 'admin',
    password: 'admin',
  }],
};

// default config
let userConfig = defaultConfig;

// reload function
const reloadUserConfig = () => {
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
export const getConfig = () => userConfig;
