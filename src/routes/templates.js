// npm packages
const path = require('path');
const fs = require('fs');
const {spawn} = require('child_process');

// our modules
const {extensionsFolder} = require('../config');

const runYarn = args =>
  new Promise(resolve => {
    const yarn = spawn('yarn', args, {cwd: extensionsFolder});
    const log = [];
    yarn.stdout.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      log.push({message, level: hasError ? 'error' : 'info'});
    });
    yarn.stderr.on('data', data => {
      const message = data.toString().replace(/\n$/, '');
      const hasError = message.toLowerCase().includes('error');
      log.push({message, level: hasError ? 'error' : 'info'});
    });
    yarn.on('exit', code => {
      log.push({message: `yarn exited with code ${code.toString()}`, level: 'info'});
      resolve(log);
    });
  });

module.exports = fastify => {
  fastify.route({
    method: 'GET',
    path: '/templates',
    async handler(request, reply) {
      const packagePath = path.join(extensionsFolder, 'package.json');
      const packageString = fs.readFileSync(packagePath).toString();
      const packageJSON = JSON.parse(packageString);

      reply.send(packageJSON.dependencies || {});
    },
  });

  fastify.route({
    method: 'POST',
    path: '/templates',
    async handler(request, reply) {
      const {templateName} = request.body;
      const log = await runYarn(['add', '--verbose', templateName]);
      reply.send({success: !log.find(it => it.level === 'error'), log});
    },
  });

  fastify.route({
    method: 'DELETE',
    path: '/templates',
    async handler(request, reply) {
      // get template that needs to be removed
      const {templateName} = request.body;

      // get list of installed templates
      const packagePath = path.join(extensionsFolder, 'package.json');
      const packageString = fs.readFileSync(packagePath).toString();
      const packageJSON = JSON.parse(packageString);

      const existingTemplate = Object.keys(packageJSON.dependencies).includes(templateName);
      if (!existingTemplate) {
        reply.send({removed: false, log: ['Template does not exist']});
        return;
      }
      // remove token from collection
      const log = await runYarn(['remove', '--verbose', templateName]);
      // send back to user
      reply.send({removed: !log.find(it => it.level === 'error'), log});
    },
  });
};
