// npm packages
const fs = require('fs');
const path = require('path');
const cpy = require('cpy');

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
exports.executeTemplate = async ({config, serverConfig, username, tempDockerDir, folder, resultStream, util}) => {
  try {
    // generate dockerfile
    const faasFolder = path.join(tempDockerDir, folder, '**', '*');
    util.writeStatus(resultStream, {message: 'Deploying function project..', level: 'info'});

    // copy folder to current folder for functions
    const destFolder = path.join(serverConfig.faasFolder, folder);
    console.log('copying', {faasFolder, destFolder});
    await cpy(faasFolder, destFolder);
    util.logger.debug('Copied function to server..');

    // return new deployment
    const frontend = require(destFolder).route || `/${config.name}`;
    const deployment = {
      Name: `/${config.name}`,
      Config: {
        Labels: {
          'traefik.frontend.rule': frontend,
          'exoframe.project': config.name,
        },
      },
      NetworkSettings: {
        Networks: {},
      },
      State: {
        Status: 'running',
      },
    };
    util.writeStatus(resultStream, {message: 'Deployment success!', deployments: [deployment], level: 'info'});
    resultStream.end('');
  } catch (e) {
    util.logger.debug('Function deployment failed!', e);
    util.writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
  }
};
