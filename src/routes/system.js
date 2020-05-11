// our modules
const {pruneDocker} = require('../docker/util');

module.exports = fastify => {
  fastify.route({
    method: 'POST',
    path: '/system/prune',
    async handler(request, reply) {
      const result = await pruneDocker();
      reply.send({pruned: true, data: result});
    },
  });
};
