// npm packages
const fs = require('fs');
const path = require('path');

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

// template name
exports.name = 'node';

// function to check if the template fits this recipe
exports.checkTemplate = async ({tempDockerDir}) => {
  // if project already has dockerfile - just exit
  try {
    const filesList = fs.readdirSync(tempDockerDir);
    if (filesList.includes('package.json')) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// function to execute current template
exports.executeTemplate = async ({username, tempDockerDir, resultStream, util, docker}) => {
  try {
    // generate dockerfile
    const filesList = fs.readdirSync(tempDockerDir);
    const dockerfile = nodeDockerfile({hasYarn: filesList.includes('yarn.lock')});
    const dfPath = path.join(tempDockerDir, 'Dockerfile');
    fs.writeFileSync(dfPath, dockerfile, 'utf-8');
    util.writeStatus(resultStream, {message: 'Deploying Node.js project..', level: 'info'});

    // build docker image
    const buildRes = await docker.build({username, resultStream});
    util.logger.debug('Build result:', buildRes);

    // check for errors in build log
    if (
      buildRes.log
        .map(it => it.toLowerCase())
        .some(it => it.includes('error') || (it.includes('failed') && !it.includes('optional')))
    ) {
      util.logger.debug('Build log conains error!');
      util.writeStatus(resultStream, {message: 'Build log contains errors!', level: 'error'});
      resultStream.end('');
      return;
    }

    // start image
    const container = await docker.start(Object.assign({}, buildRes, {username, resultStream}));
    util.logger.debug(container.Name);

    // clean temp folder
    await util.cleanTemp();

    // return new deployments
    util.writeStatus(resultStream, {message: 'Deployment success!', deployments: [container], level: 'info'});
    resultStream.end('');
  } catch (e) {
    util.logger.debug('build failed!', e);
    util.writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
  }
};
