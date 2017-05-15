/* eslint global-require: 0 */
const {waitForConfig} = require('../src/config');

const run = async () => {
  await waitForConfig();

  require('./login');
};
run();
