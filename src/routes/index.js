// our modules
const deploy = require('./deploy');
const list = require('./list');
const remove = require('./remove');
const logs = require('./logs');

module.exports = server => {
  deploy(server);
  list(server);
  remove(server);
  logs(server);
};
