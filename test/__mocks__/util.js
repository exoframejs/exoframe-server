/* eslint-env jest */
// mock util module
const {runYarn, getProjectConfig, ...actualUtil} = jest.requireActual('../../src/util/index.js');
const util = jest.genMockFromModule('../../src/util/index.js');

util.runYarn = () => new Promise(r => r());
util.getProjectConfig = folder => folder;

module.exports = {...util, ...actualUtil};
