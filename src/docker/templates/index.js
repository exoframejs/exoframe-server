/* eslint global-require: off */
/* eslint import/no-dynamic-require: off */
// npm packages
const fs = require('fs');
const path = require('path');
// our packages
const {extensionsFolder} = require('../../config');

// hard-coded templates
const imageTemplate = require('./image');
const composeTemplate = require('./compose');
const dockerfileTemplate = require('./dockerfile');
const nodeTemplate = require('./node');
const nginxTemplate = require('./nginx');
const faasTemplate = require('./faas');

// load 3rd party templates
module.exports = () => {
  const packagePath = path.join(extensionsFolder, 'package.json');
  const packageString = fs.readFileSync(packagePath).toString();
  const packageJSON = JSON.parse(packageString);
  const userTemplateNames = Object.keys(packageJSON.dependencies || {});
  const userTemplates = userTemplateNames.map(templateName => {
    const templatePath = path.join(extensionsFolder, 'node_modules', templateName);
    return require(templatePath);
  });

  return [faasTemplate, imageTemplate, composeTemplate, dockerfileTemplate, nodeTemplate, nginxTemplate].concat(
    userTemplates
  );
};
