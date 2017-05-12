// npm modules
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');
const rimraf = require('rimraf');

// our modules
const logger = require('../logger');

// dir for temporary files used to build docker images
const tempDir = path.join(__dirname, '..', '..', 'temp', 'deploying');
exports.tempDockerDir = tempDir;

// cleanup temp folder
exports.cleanTemp = () => new Promise(resolve => rimraf(tempDir, resolve));

// unpack function for incoming project files
exports.unpack = tarPath =>
  new Promise((resolve, reject) => {
    // create whatever writestream you want
    const s = fs.createReadStream(tarPath).pipe(tar.extract(tempDir));
    s.on('finish', () => resolve());
    s.on('error', e => reject(e));
  });

exports.getProjectConfig = () => {
  let config;

  // try to get project exoframe config
  try {
    const projectConfigString = fs.readFileSync(
      path.join(tempDir, 'exoframe.json')
    );
    config = JSON.parse(projectConfigString);
  } catch (e) {
    logger.debug('No config given');
  }

  return config;
};
