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
        const result = JSON.parse(response.payload);

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(result.length, 3, 'Should have three deployments');
        // check container info
        const container = result[2];
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

        // check second container info
        const containerTwo = result.find(r => r.Name.startsWith('/exo-admin-test-compose-deploy-web-'));
        t.ok(containerTwo.Name.startsWith('/exo-admin-test-compose-deploy-web-'), 'Should have correct name');
        t.ok(
          containerTwo.Config.Labels['exoframe.deployment'].startsWith('exo-admin-test-compose-deploy-web-'),
          'Should have correct deployment label'
        );
        t.equal(containerTwo.Config.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerTwo.Config.Labels['traefik.backend'],
          'exo-admin-test-compose-deploy-web',
          'Should have correct backend label'
        );
        t.equal(
          containerTwo.Config.Labels['traefik.frontend.rule'],
          'Host:test.dev',
          'Should have correct frontend label'
        );
        // check second container info
        const containerThree = result.find(r => r.Name.startsWith('/exo-admin-test-compose-deploy-redis-'));
        t.ok(containerThree.Name.startsWith('/exo-admin-test-compose-deploy-redis-'), 'Should have correct name');
        t.ok(
          containerThree.Config.Labels['exoframe.deployment'].startsWith('exo-admin-test-compose-deploy-redis-'),
          'Should have correct deployment label'
        );
        t.equal(containerThree.Config.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerThree.Config.Labels['traefik.backend'],
          'exo-admin-test-compose-deploy-redis',
          'Should have correct backend label'
        );

        resolve({
          deployment: container.Name.replace('/', ''),
          project: containerTwo.Config.Labels['exoframe.project'],
        });
        t.end();
      });
    });
  });
