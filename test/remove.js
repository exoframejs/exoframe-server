// npm packages
const tap = require('tap');

// our packages
const docker = require('../src/docker/docker');

module.exports = (server, token, name) =>
  new Promise(resolve => {
    tap.test('Should remove current project', t => {
      // options base
      const options = {
        method: 'POST',
        url: `/remove/${encodeURIComponent(name)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
        // check response
        t.equal(response.statusCode, 204, 'Correct status code');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${name}`));
        t.notOk(container, 'Should no longer exist');

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
