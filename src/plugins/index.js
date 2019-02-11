const path = require('path');
// config
const {getConfig, waitForConfig, pluginsFolder} = require('../config');
const {runYarn} = require('../util');
const logger = require('../logger');

const loadedPlugins = [];

exports.getPlugins = () => loadedPlugins;

exports.initPlugins = async () => {
  console.log('init plugins');
  // enable cors if needed
  await waitForConfig();
  const config = getConfig();

  console.log('loaded plugins');

  // if no plugins added - just exit
  if (!config.plugins || !config.plugins.install || !config.plugins.install.length) {
    console.log('no plugins, done');
    return;
  }

  // get list of plugins, install them and load into memory
  const pluginsList = config.plugins.install;
  for (const pluginName of pluginsList) {
    const log = await runYarn({args: ['add', '--verbose', pluginName], cwd: pluginsFolder});
    logger.debug('Installed plugin:', pluginName);
    logger.debug('Install log:', log);
    const pluginPath = path.join(pluginsFolder, 'node_modules', pluginName);
    const plugin = require(pluginPath);
    loadedPlugins.push(plugin);
  }

  logger.debug('Done loading plugins: ', loadedPlugins);

  const exclusivePlugins = loadedPlugins.map(p => p.config).filter(cfg => cfg.exclusive);
  if (exclusivePlugins.length > 1) {
    logger.warn(`WARNING! You have installed ${exclusivePlugins.length} exclusive mode plugins!
This might cause unexpected behaviour during Exoframe deployemnts.
Please, only include one exclusive plugin at a time!`);
  }
};
