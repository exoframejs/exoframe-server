// npm modules
const os = require('os');
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');
const rimraf = require('rimraf');

// dir for temporary files used to build docker images
// construct paths
const baseFolder = path.join(os.homedir(), '.exoframe');
const tempDir = path.join(baseFolder, 'deploying');
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
  const projectConfigString = fs.readFileSync(
    path.join(tempDir, 'exoframe.json')
  );
  const config = JSON.parse(projectConfigString);

  return config;
};
