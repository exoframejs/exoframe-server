// npm packages
const tap = require('tap');

module.exports = (server, token) => {
  tap.test('Should get current and latest versions', t => {
    // options base
    const options = {
      method: 'GET',
      url: '/version',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    server.inject(options, async response => {
      const result = JSON.parse(response.payload);

      // check response
      t.equal(response.statusCode, 200, 'Correct status code');
      t.ok(result.server, 'Should have server version');
      t.ok(result.traefik, 'Should have traefik version');
      t.ok(result.latestServer, 'Should have latest server version');
      t.ok(result.latestTraefik, 'Should have latest traefik version');

      t.end();
    });
  });
};
