const {tempDockerDir} = require("../config");
const _ = require('lodash');
const {spawn} = require('child_process');
const logger = require('../logger');
const path = require('path');

module.exports = fastify => {
  fastify.route({
    method: 'POST',
    path: '/registry',
    async handler(request, reply) {
      try {
        // get username
        console.log(request.body);
        const {username, password, host} = request.body;

        if (!username || !password || !host) {
          reply.status(400).send({
            message: "Missing information"
          });
        }

        const dc = spawn('docker', ['login', '--username', username, '--password', password, host], {cwd: path.join(tempDockerDir), env: {...process.env}});
        const log = [];

        dc.stdout.on('data', data => {
          const message = data.toString().replace(/\n$/, '');

          log.push(message);
          logger.debug(message)
        });
        dc.stderr.on('data', data => {
          const message = data.toString().replace(/\n$/, '');
          log.push(message);
          logger.debug(message)
        });
        dc.on('exit', code => {
          logger.debug(`Docker-compose exited with code ${code.toString()}`);
          if (code === 0) {
            reply.code(200).send(log)
          } else {
            reply.code(500).send(log)
          }
        });
      } catch(e) {
        console.log(e.message);
        reply.code(500).send("Unexpected error occurred: "+e.message)
      }


    },
  });
};
