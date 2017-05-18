// npm packages
const tap = require('tap');

module.exports = (server, token, name) =>
  new Promise(resolve => {
    tap.test('Should get logs for current project', t => {
      // options base
      const options = {
        method: 'GET',
        url: `/logs/${encodeURIComponent(name)}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
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
        t.deepEqual(lines, ['yarn start', '$ node index.js ', 'Listening on port 80'], 'Should have log');

        t.end();
      });
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
