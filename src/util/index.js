// npm modules
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');
const rimraf = require('rimraf');
const uuid = require('uuid');

// our modules
const {tempDockerDir: tempDir} = require('../config');

// cleanup temp folder
exports.cleanTemp = () => new Promise(resolve => rimraf(tempDir, resolve));

// unpack function for incoming project files
exports.unpack = tarStream =>
  new Promise((resolve, reject) => {
    // create whatever writestream you want
    const s = tarStream.pipe(tar.extract(tempDir));
    s.on('finish', () => resolve());
    s.on('error', e => reject(e));
  });

exports.getProjectConfig = () => {
  const projectConfigString = fs.readFileSync(path.join(tempDir, 'exoframe.json'));
  const config = JSON.parse(projectConfigString);

  return config;
};

exports.tagFromConfig = ({username, config}) => `exo-${_.kebabCase(username)}-${_.kebabCase(config.name)}:latest`;

exports.baseNameFromImage = image => image.split(':').shift();

exports.nameFromImage = image => {
  const baseName = exports.baseNameFromImage(image);
  const uid = uuid.v1();
  return `${baseName}-${uid.split('-').shift()}`;
};

exports.projectFromConfig = ({username, config}) => {
  const image = exports.tagFromConfig({username, config});
  const baseName = exports.baseNameFromImage(image);
  return config.project || baseName;
};

exports.sleep = time => new Promise(r => setTimeout(r, time));

exports.writeStatus = (stream, data) => stream.write(`${JSON.stringify(data)}\n`);
