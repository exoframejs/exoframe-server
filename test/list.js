// npm packages
const tap = require('tap');

module.exports = (server, token) =>
  new Promise(resolve => {
    tap.test('Should list deployed projects', t => {
      // options base
      const options = {
        method: 'GET',
        url: '/list',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
        const result = response.result;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(result.length, 1, 'Should have one deployment');
        // check container info
        const container = result[0];
        t.ok(container.Name.startsWith('/exo-admin-test-node-deploy-'), 'Should have correct name');
        t.ok(
          container.Config.Labels['exoframe.deployment'].startsWith('exo-admin-test-node-deploy-'),
          'Should have correct deployment label'
        );
        t.equal(container.Config.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Config.Labels['traefik.backend'],
          'exo-admin-test-node-deploy',
          'Should have correct backend label'
        );
        t.equal(
          container.Config.Labels['traefik.frontend.rule'],
          'Host:localhost',
          'Should have correct frontend label'
        );

        resolve(container.Name.replace('/', ''));
        t.end();
      });
    });
  });
