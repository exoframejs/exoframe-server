// npm packages
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

// template name
exports.name = 'faas';

// function to check if the template fits this recipe
exports.checkTemplate = async ({config}) => {
  // if project has function field defined in config
  try {
    return config.function;
  } catch (e) {
    return false;
  }
};

// function to execute current template
exports.executeTemplate = async ({config, serverConfig, username, tempDockerDir, folder, resultStream, util, faas}) => {
  try {
    // generate dockerfile
    const faasFolder = path.join(tempDockerDir, folder);
    util.writeStatus(resultStream, {message: 'Deploying function project..', level: 'info'});

    // execute yarn to install deps
    const hasPackageJson = fs.existsSync(path.join(faasFolder, 'package.json'));
    util.logger.debug('Function has package.json:', hasPackageJson);
    if (hasPackageJson) {
      const log = await util.runYarn({args: ['install'], cwd: faasFolder});
      util.logger.debug('Installed function deps:', log);
    }

    // copy folder to current folder for functions
    const destFolder = path.join(serverConfig.faasFolder, folder);
    util.logger.debug('Copying function from-to:', {faasFolder, destFolder});
    await fse.move(faasFolder, destFolder);
    util.logger.debug('Copied function to server..');

    // register new function
    await faas.registerFunction(folder);
    util.logger.debug('Registered function on server..');

    // return new deployment
    const {route, type} = {route: `/${config.name}`, type: 'http', ...config.function};
    const deployment = util.functionToContainerFormat({config, route, type});
    util.writeStatus(resultStream, {message: 'Deployment success!', deployments: [deployment], level: 'info'});
    resultStream.end('');
  } catch (e) {
    util.logger.debug('Function deployment failed!', e);
    util.writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
  }
};
