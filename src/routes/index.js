// our modules
const deploy = require('./deploy');
const list = require('./list');
const remove = require('./remove');
const logs = require('./logs');
const home = require('./home');
const update = require('./update');
const version = require('./version');

module.exports = server => {
  deploy(server);
  list(server);
  remove(server);
  logs(server);
  home(server);
  update(server);
  version(server);
};
