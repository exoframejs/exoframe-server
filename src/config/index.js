// npm packages
const os = require('os');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {spawn} = require('child_process');

// our packages
const logger = require('../logger');

// construct paths
const baseFolder = path.join(os.homedir(), '.exoframe');
const configPath = path.join(baseFolder, 'server.config.yml');
const publicKeysPath = path.join(os.homedir(), '.ssh');
const extensionsFolder = path.join(baseFolder, 'extensions');
const recipesFolder = path.join(baseFolder, 'recipes');
const pluginsFolder = path.join(baseFolder, 'plugins');
const faasFolder = path.join(baseFolder, 'faas');
// dir for temporary files used to build docker images
const tempDir = path.join(baseFolder, 'deploying');

// export paths for others
exports.baseFolder = baseFolder;
exports.extensionsFolder = extensionsFolder;
exports.recipesFolder = recipesFolder;
exports.pluginsFolder = pluginsFolder;
exports.faasFolder = faasFolder;
exports.tempDockerDir = tempDir;

// create base folder if doesn't exist
try {
  fs.statSync(baseFolder);
} catch (e) {
  fs.mkdirSync(baseFolder);
}

// create faas folder if doesn't exist
try {
  fs.statSync(faasFolder);
} catch (e) {
  fs.mkdirSync(faasFolder);
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
  spawn('yarn', ['init', '-y', '--silent'], {cwd: extensionsFolder});
}

// create recipes folder if doesn't exist
try {
  fs.statSync(recipesFolder);
} catch (e) {
  fs.mkdirSync(recipesFolder);
}
// init package.json if it doesn't exist
try {
  fs.statSync(path.join(recipesFolder, 'package.json'));
} catch (e) {
  spawn('yarn', ['init', '-y', '--silent'], {cwd: recipesFolder});
}

// create plugins folder if doesn't exist
try {
  fs.statSync(pluginsFolder);
} catch (e) {
  fs.mkdirSync(pluginsFolder);
}
// init package.json if it doesn't exist
try {
  fs.statSync(path.join(pluginsFolder, 'package.json'));
} catch (e) {
  spawn('yarn', ['init', '-y', '--silent'], {cwd: pluginsFolder});
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
  traefikImage: 'traefik:v1.7',
  traefikName: 'exoframe-traefik',
  traefikArgs: [],
  exoframeNetwork: 'exoframe',
  publicKeysPath,
  plugins: {
    install: [],
  },
};

// default config
let userConfig = defaultConfig;

// config loaded promise
let loadedResolve = () => {};
const isConfigLoaded = new Promise(resolve => {
  loadedResolve = resolve;
});

// reload function
const reloadUserConfig = () => {
  // mon
  try {
    userConfig = Object.assign(defaultConfig, yaml.safeLoad(fs.readFileSync(configPath, 'utf8')));
    logger.debug('loaded new config:', userConfig);
    loadedResolve();
  } catch (e) {
    if (e.code === 'ENOENT') {
      logger.warn('no config found, using default values..');
    } else {
      logger.error('error parsing user config:', e);
    }
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
  fs.watchFile(configPath, reloadUserConfig);
}

// trigger initial load
reloadUserConfig();

// function to get latest config read config file
exports.getConfig = () => userConfig;
exports.waitForConfig = () => isConfigLoaded;
