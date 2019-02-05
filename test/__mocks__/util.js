/* eslint-env jest */
// mock util module
const util = jest.genMockFromModule('../../src/util/index.js');

util.runYarn = () => new Promise(r => r());
util.getProjectConfig = folder => folder;

module.exports = util;
