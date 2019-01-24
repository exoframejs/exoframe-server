// npm packages
const fs = require('fs');
const path = require('path');

// template name
exports.name = 'dockerfile';

// function to check if the template fits this recipe
exports.checkTemplate = async ({tempDockerDir, folder}) => {
  // if project already has dockerfile - just exit
  try {
    fs.readFileSync(path.join(tempDockerDir, folder, 'Dockerfile'));
    return true;
  } catch (e) {
    return false;
  }
};

// function to execute current template
exports.executeTemplate = async ({username, folder, resultStream, util, docker, existing}) => {
  // build docker image
  try {
    util.writeStatus(resultStream, {message: 'Deploying Dockerfile project..', level: 'info'});

    const buildRes = await docker.build({username, folder, resultStream});
    util.logger.debug('Build result:', buildRes);

    // start image
    const container = await docker.start(Object.assign({}, buildRes, {username, folder, existing, resultStream}));
    util.logger.debug(container);

    // return new deployments
    util.writeStatus(resultStream, {message: 'Deployment success!', deployments: [container], level: 'info'});
    resultStream.end('');
  } catch (e) {
    util.logger.debug('build failed!', e);
    util.writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
  }
};
