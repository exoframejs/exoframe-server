// npm packages
const fs = require('fs');
const path = require('path');

// our packages
const logger = require('../../logger');
const {tempDockerDir, writeStatus} = require('../../util');
const nodeDockerfile = require('./node-docker');
const nginxDockerfile = require('./nginx-dockerfile');

module.exports = resultStream => {
  // if project already has dockerfile - just exit
  try {
    fs.readFileSync(path.join(tempDockerDir, 'Dockerfile'));
    logger.debug('Project already has dockerfile!');
    writeStatus(resultStream, {message: 'Deploying Dockerfile project..', level: 'info'});
    return;
  } catch (e) {
    logger.debug('No dockerfile found, going to generate a new one..');
  }

  // determine correct dockerfile
  let dockerfile;
  const filesList = fs.readdirSync(tempDockerDir);

  // if it's a node.js project
  if (filesList.includes('package.json')) {
    dockerfile = nodeDockerfile({hasYarn: filesList.includes('yarn.lock')});
    writeStatus(resultStream, {message: 'Deploying Node.js project..', level: 'info'});
  } else if (filesList.includes('index.html')) {
    dockerfile = nginxDockerfile;
    writeStatus(resultStream, {message: 'Deploying Static HTML project..', level: 'info'});
  }

  logger.debug('Using dockerfile:', dockerfile);
  writeStatus(resultStream, {message: 'Using dockerfile..', dockerfile, level: 'verbose'});

  if (!dockerfile) {
    logger.error('No suitable dockerfile found');
    writeStatus(resultStream, {message: 'Error! No suitable dockerfile found!', level: 'error'});
    throw new Error('No suitable dockerfile found');
  }

  // add dockerfile
  const dfPath = path.join(tempDockerDir, 'Dockerfile');
  fs.writeFileSync(dfPath, dockerfile, 'utf-8');
};
