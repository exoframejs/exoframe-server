// npm packages
const fs = require('fs');
const path = require('path');

// our packages
const {tempDockerDir} = require('../util');
const nodeDockerfile = require('./node-docker');

module.exports = () => {
  // add dockerfile
  const dfPath = path.join(tempDockerDir, 'Dockerfile');
  const dockerfile = nodeDockerfile;
  fs.writeFileSync(dfPath, dockerfile, 'utf-8');
};
