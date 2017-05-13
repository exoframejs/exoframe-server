// our modules
const deploy = require('./deploy');
const list = require('./list');

module.exports = server => {
  deploy(server);
  list(server);
};
