// npm modules
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');

// dir for temporary files used to build docker images
const tempDir = path.join(__dirname, '..', '..', 'temp', 'deploying');
exports.tempDockerDir = tempDir;

// unpack function for incoming project files
exports.unpack = tarPath =>
  new Promise((resolve, reject) => {
    // create whatever writestream you want
    const s = fs.createReadStream(tarPath).pipe(tar.extract(tempDir));
    s.on('finish', () => resolve());
    s.on('error', e => reject(e));
  });

