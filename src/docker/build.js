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
    const output = await docker.buildImage(tarStream, {t: tag});
    output.on('data', d => {
      const str = d.toString();
      const parts = str.split('\n');
      parts.filter(s => s.length > 0).forEach(s => {
        try {
          const data = JSON.parse(s);
          if (data.stream && data.stream.length) {
            log.push(data.stream);
          }
        } catch (e) {
          if (s && s.length) {
            log.push(s);
          }
        }
      });
    });
    output.on('error', e => reject(e));
    output.on('end', () => resolve({log, image: tag}));
  });
