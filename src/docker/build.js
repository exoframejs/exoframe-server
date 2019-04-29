// npm modules
const {pullImage} = require("./init");

const {getDockerAuthentication} = require("./init");

const path = require('path');
const tar = require('tar-fs');
const fs = require('fs');

// our modules
const logger = require('../logger');
const docker = require('./docker');
const {tempDockerDir} = require('../config');
const {getProjectConfig, tagFromConfig, writeStatus} = require('../util');

const noop = () => {};

exports.buildFromParams = ({tarStream, tag, fromTag, logLine = noop}) =>
  new Promise(async (resolve, reject) => {
    // deploy as docker
    const log = [];
    // track errors
    let hasErrors = false;

    const auth = getDockerAuthentication(fromTag);
    if (auth) {
      logger.debug(`Pulling image ${fromTag} with auth`);
      await pullImage(fromTag)
    }

    // send build command
    const output = await docker.buildImage(tarStream, {t: tag, pull: !auth});
    output.on('data', d => {
      const str = d.toString();
      const parts = str.split('\n');
      parts
        .filter(s => s.length > 0)
        .forEach(s => {
          try {
            const data = JSON.parse(s);
            // process log data
            if (data.stream && data.stream.length) {
              log.push(data.stream);
              logLine({message: data.stream, level: 'verbose'});
            } else if (data.error && data.error.length) {
              // process error data
              log.push(data.error);
              logLine({message: data.error, level: 'error'});
              hasErrors = true;
            } else {
              // push everything else as-is
              log.push(s);
              logLine({message: s, level: 'verbose'});
            }
          } catch (e) {
            if (s && s.length) {
              log.push(s);
              logLine({message: s, level: 'verbose'});
            }
          }
        });
    });
    output.on('end', () => {
      if (hasErrors) {
        reject({error: 'Build failed! See build log for details.', log, image: tag});
        return;
      }
      resolve({log, image: tag});
    });
  });

exports.build = async ({username, folder, resultStream}) => {
  // dockerfile
  const dockerfile = path.join(tempDockerDir, folder, 'Dockerfile');
  const dockerfileContent = fs.readFileSync(dockerfile);
  const fromTag = dockerfileContent.toString().match(/FROM (.*)/)[1];

  // get packed stream
  const tarStream = tar.pack(path.join(tempDockerDir, folder));

  // get project info
  const config = getProjectConfig(folder);

  // construct image tag
  const tag = tagFromConfig({username, config});
  logger.debug('building with tag:', tag);
  writeStatus(resultStream, {message: `Building image with tag: ${tag}`, level: 'verbose'});

  // create logger function
  const logLine = data => writeStatus(resultStream, data);

  // return build
  return exports.buildFromParams({tarStream, tag, fromTag, logLine});
};
