// npm packages
const tap = require('tap');

// our packages
const docker = require('../src/docker/docker');

module.exports = (server, token, data) =>
  new Promise(resolve => {
    tap.test('Should remove current deployment', t => {
      // options base
      const options = {
        method: 'POST',
        url: `/remove/${encodeURIComponent(data.deployment)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
        // check response
        t.equal(response.statusCode, 204, 'Correct status code');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${data.deployment}`));
        t.notOk(container, 'Should no longer exist');

        t.end();
      });
    });

    tap.test('Should remove current project', t => {
      // options base
      const options = {
        method: 'POST',
        url: `/remove/${encodeURIComponent(data.project)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
        // check response
        t.equal(response.statusCode, 204, 'Correct status code');

        // check docker services
        const allContainers = await docker.listContainers();
        t.equal(allContainers.length, 0, 'Should no longer exist');

        t.end();
      });
    });

    tap.test('Should return error when removing nonexistent project', t => {
      // options base
      const options = {
        method: 'POST',
        url: `/remove/do-not-exist`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, response => {
        // check response
        t.equal(response.statusCode, 404, 'Correct status code');
        t.deepEqual(response.result, {error: 'Container not found!'}, 'Should have error');
        t.end();
      });
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
