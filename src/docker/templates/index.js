const composeTemplate = require('./compose');
const dockerfileTemplate = require('./dockerfile');
const nodeTemplate = require('./node');
const nginxTemplate = require('./nginx');

module.exports = [composeTemplate, dockerfileTemplate, nodeTemplate, nginxTemplate];
