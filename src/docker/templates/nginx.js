// npm packages
const fs = require('fs');
const path = require('path');

const nginxDockerfile = `FROM nginx:latest
COPY . /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html
`;

// template name
exports.name = 'static';

// function to check if the template fits this recipe
exports.checkTemplate = async ({tempDockerDir}) => {
  // if project already has dockerfile - just exit
  try {
    const filesList = fs.readdirSync(tempDockerDir);
    if (filesList.includes('index.html')) {
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
    const dockerfile = nginxDockerfile;
    const dfPath = path.join(tempDockerDir, 'Dockerfile');
    fs.writeFileSync(dfPath, dockerfile, 'utf-8');
    util.writeStatus(resultStream, {message: 'Deploying Static HTML project..', level: 'info'});

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
    const containerInfo = await docker.start(Object.assign({}, buildRes, {username, resultStream}));
    util.logger.debug(containerInfo.Name);

    // clean temp folder
    await util.cleanTemp();

    const containerData = docker.daemon.getContainer(containerInfo.Id);
    const container = await containerData.inspect();
    // return new deployments
    util.writeStatus(resultStream, {message: 'Deployment success!', deployments: [container], level: 'info'});
    resultStream.end('');
  } catch (e) {
    util.logger.debug('build failed!', e);
    util.writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
  }
};
