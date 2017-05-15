// npm packages
const fs = require('fs');
const path = require('path');

// our packages
const logger = require('../../logger');
const {tempDockerDir} = require('../../util');
const nodeDockerfile = require('./node-docker');
const nginxDockerfile = require('./nginx-dockerfile');

module.exports = () => {
  // if project already has dockerfile - just exit
  try {
    fs.readFileSync(path.join(tempDockerDir, 'Dockerfile'));
    logger.debug('Project already has dockerfile!');
    return;
  } catch (e) {
    logger.debug('No dockerfile found, going to generate a new one..');
  }

  // determine correct dockerfile
  let dockerfile;
  const filesList = fs.readdirSync(tempDockerDir);

  // if it's a node.js project
  if (
    filesList.includes('package.json') &&
    filesList.includes('node_modules')
  ) {
    dockerfile = nodeDockerfile;
  } else if (filesList.includes('index.html')) {
    dockerfile = nginxDockerfile;
  }

  logger.debug('Using dockerfile:', dockerfile);

  if (!dockerfile) {
    logger.error('No suitable dockerfile found');
    throw new Error('No suitable dockerfile found');
  }

  // add dockerfile
  const dfPath = path.join(tempDockerDir, 'Dockerfile');
  fs.writeFileSync(dfPath, dockerfile, 'utf-8');
};
