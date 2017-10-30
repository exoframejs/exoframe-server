// npm packages
const tap = require('tap');

module.exports = (server, token, data) =>
  new Promise(resolve => {
    tap.test('Should get logs for current deployment', t => {
      // options base
      const options = {
        method: 'GET',
        url: `/logs/${encodeURIComponent(data.deployment)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, response => {
        // check response
        t.equal(response.statusCode, 200, 'Correct status code');

        const {result} = response;
        const lines = result
          // split by lines
          .split('\n')
          // remove unicode chars
          .map(line => line.replace(/^\u0001.+?\d/, '').replace(/\n+$/, ''))
          // filter blank lines
          .filter(line => line && line.length > 0)
          // remove timestamps
          .map(line => {
            const parts = line.split(/\dZ\s/);
            return parts[1].replace(/\sv\d.+/, ''); // strip any versions
          });
        t.deepEqual(
          lines,
          ['', '> node-project@1.0.0 start /usr/src/app', '> node index.js', '', 'Listening on port 80'],
          'Should have correct log'
        );
        t.end();
      });
    });

    tap.test('Should get logs for current project', t => {
      // options base
      const options = {
        method: 'GET',
        url: `/logs/${encodeURIComponent(data.project)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, response => {
        // check response
        t.equal(response.statusCode, 200, 'Correct status code');

        const {result} = response;
        const text = result
          // split by lines
          .split('\n')
          // remove unicode chars
          .map(line => line.replace(/^\u0001.+?\d/, '').replace(/\n+$/, ''))
          // filter blank lines
          .filter(line => line && line.length > 0)
          // remove timestamps
          .map(line => {
            if (line.startsWith('Logs for')) {
              return line;
            }
            const parts = line.split(/\dZ\s/);
            return parts[1].replace(/\sv\d.+/, ''); // strip any versions
          })
          .join();

        t.ok(text.includes('Logs for exo-admin-test-compose-deploy-redis-'));
        t.ok(text.includes('oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo'));
        t.ok(text.includes('Redis version='));
        t.ok(text.includes('just started'));
        t.ok(text.includes('Warning: no config file specified, using the default config.'));
        t.ok(text.includes('Running mode=standalone, port=6379.'));
        t.ok(text.includes('Ready to accept connections'));
        t.ok(text.includes('Logs for exo-admin-test-compose-deploy-web-'));

        t.end();
      });
    });

    tap.test('Should not get logs for nonexistent project', t => {
      // options base
      const options = {
        method: 'GET',
        url: `/logs/do-not-exist`,
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
