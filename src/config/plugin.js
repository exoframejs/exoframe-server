// npm packages
import _ from 'lodash';
import {exec} from 'child_process';
import Bluebird from 'bluebird';

// our packages
import logger from '../logger';

// promisify
const execPromise = Bluebird.promisify(exec);
// install function
const installNodeModule = ({module}) => execPromise(`npm install ${module}`);

export default async (config) => {
  if (!config.plugins) {
    return;
  }

  const pluginTypes = Object.keys(config.plugins);
  await Promise.all(pluginTypes.map(type => {
    const pluginsToInstall = config.plugins[type];
    logger.debug('Installing plugins for', type, ':', pluginsToInstall);
    return Promise.all(
      pluginsToInstall.map(plugin => {
        if (_.isObject(plugin)) {
          const name = Object.keys(plugin)[0];
          const module = plugin[name];
          return {module, name};
        }

        return {module: plugin, name: plugin};
      })
      .map(plugin => installNodeModule(plugin))
    );
  }));

  logger.debug('Installed all plugins!');
};
