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
        t.equal(lines[0], 'npm info it worked if it ends with ok');
        t.ok(lines[1].startsWith('npm info using npm@'));
        t.ok(lines[2].startsWith('npm info using node@'));
        t.deepEqual(
          lines.slice(3),
          [
            'npm info lifecycle node-project@1.0.0~prestart: node-project@1.0.0',
            'npm info lifecycle node-project@1.0.0~start: node-project@1.0.0',
            '',
            '> node-project@1.0.0 start /usr/src/app',
            '> node index.js',
            '',
            'Listening on port 80',
          ],
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
        const lines = result
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
          });

        console.log(lines);

        t.ok(lines[0].startsWith('Logs for exo-admin-test-compose-deploy-redis-'));
        t.ok(lines[1].includes('oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo'));
        t.ok(lines[2].includes('Redis version=') && lines[2].includes('just started'));
        t.ok(
          lines[3].includes(
            'Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf'
          )
        );
        t.ok(lines[4].includes('Running mode=standalone, port=6379.'));
        t.ok(
          lines[5].includes(
            'WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.'
          )
        );
        t.ok(lines[6].includes('Server initialized'));
        t.ok(
          lines[7].includes(
            `WARNING you have Transparent Huge Pages (THP) support enabled in your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to your /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after THP is disabled.`
          )
        );
        t.ok(lines[8].includes('Ready to accept connections'));
        t.ok(lines[9].startsWith('Logs for exo-admin-test-compose-deploy-web-'));

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
