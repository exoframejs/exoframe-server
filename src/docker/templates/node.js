// npm packages
const fs = require('fs');
const path = require('path');

// our packages
const logger = require('../../logger');
const docker = require('../../docker/docker');
const build = require('../build');
const start = require('../start');
const {tempDockerDir, writeStatus, cleanTemp} = require('../../util');

const nodeDockerfile = ({hasYarn}) =>
  `FROM node:latest

# create folder and set it as workdir
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy package and yarn files to cache deps install
COPY package.json /usr/src/app/${
    hasYarn
      ? `
COPY yarn.lock /usr/src/app/
RUN yarn`
      : `
RUN npm install --silent`
  }

# copy app itself
COPY . /usr/src/app

EXPOSE 80

CMD ["npm", "start"]
`;

// function to check if the template fits this recipe
exports.checkTemplate = async ({resultStream}) => {
  // if project already has dockerfile - just exit
  try {
    const filesList = fs.readdirSync(tempDockerDir);
    if (filesList.includes('package.json')) {
      const dockerfile = nodeDockerfile({hasYarn: filesList.includes('yarn.lock')});
      const dfPath = path.join(tempDockerDir, 'Dockerfile');
      fs.writeFileSync(dfPath, dockerfile, 'utf-8');
      writeStatus(resultStream, {message: 'Deploying Node.js project..', level: 'info'});
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// function to execute current template
exports.executeTemplate = async ({username, resultStream}) => {
  // build docker image
  try {
    const buildRes = await build({username, resultStream});
    logger.debug('Build result:', buildRes);

    // check for errors in build log
    if (
      buildRes.log
        .map(it => it.toLowerCase())
        .some(it => it.includes('error') || (it.includes('failed') && !it.includes('optional')))
    ) {
      logger.debug('Build log conains error!');
      writeStatus(resultStream, {message: 'Build log contains errors!', level: 'error'});
      resultStream.end('');
      return;
    }

    // start image
    const containerInfo = await start(Object.assign({}, buildRes, {username, resultStream}));
    logger.debug(containerInfo.Name);

    // clean temp folder
    await cleanTemp();

    const containerData = docker.getContainer(containerInfo.Id);
    const container = await containerData.inspect();
    // return new deployments
    writeStatus(resultStream, {message: 'Deployment success!', deployments: [container], level: 'info'});
    resultStream.end('');
  } catch (e) {
    logger.debug('build failed!', e);
    writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
  }
};
