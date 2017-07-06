const fs = require('fs');
const {join} = require('path');

module.exports = server => {
  server.route({
    method: 'GET',
    path: '/',
    config: {auth: false},
    handler(request, reply) {
      const templatePath = join(__dirname, '..', 'templates', 'home.html');
      const template = fs.readFileSync(templatePath).toString();
      reply(template);
    },
  });
};
