// our modules
const {getConfig, waitForConfig} = require('../config');
const docker = require('./docker');
const logger = require('../logger');
const {initNetwork} = require('./network');
const {getPlugins} = require('../plugins');
const {initTraefik} = require('./traefik');

// export default function
exports.initDocker = async () => {
  await waitForConfig();

  logger.info('Initializing docker services...');
  // create exoframe network if needed
  const exoNet = await initNetwork();

  // get config
  const config = getConfig();

  // run init via plugins if available
  const plugins = getPlugins();
  logger.debug('Got plugins, running init:', plugins);
  for (const plugin of plugins) {
    // only run plugins that have init function
    if (!plugin.init) {
      continue;
    }

    const result = await plugin.init({config, logger, docker});
    logger.debug('Initing traefik with plugin:', plugin.config.name, result);
    if (result && plugin.config.exclusive) {
      logger.info('Init finished via exclusive plugin:', plugin.config.name);
      return;
    }
  }

  // run traefik init
  await initTraefik(exoNet);
};
