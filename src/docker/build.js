// npm modules
const tar = require('tar-fs');

// our modules
const logger = require('../logger');
const docker = require('./docker');
const {tempDockerDir, getProjectConfig, tagFromConfig} = require('../util');

module.exports = ({username}) =>
  new Promise(async (resolve, reject) => {
    // get packed stream
    const tarStream = tar.pack(tempDockerDir);

    // get project info
    const config = getProjectConfig();

    // construct image tag
    const tag = tagFromConfig({username, config});
    logger.debug('building with tag:', tag);

    // deploy as docker
    const log = [];
    // track errors
    let hasErrors = false;
    // send build command
    const output = await docker.buildImage(tarStream, {t: tag});
    output.on('data', d => {
      const str = d.toString();
      const parts = str.split('\n');
      parts.filter(s => s.length > 0).forEach(s => {
        try {
          const data = JSON.parse(s);
          // process log data
          if (data.stream && data.stream.length) {
            log.push(data.stream);
          } else if (data.error && data.error.length) {
            // process error data
            log.push(data.error);
            hasErrors = true;
          } else {
            // push everything else as-is
            log.push(s);
          }
        } catch (e) {
          if (s && s.length) {
            log.push(s);
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
