// npm packages
const tap = require('tap');
const path = require('path');
const tar = require('tar-fs');

// our packages
const docker = require('../src/docker/docker');

module.exports = async (server, token) => {
  // create tar streams
  const streamDocker = tar.pack(path.join(__dirname, 'fixtures', 'docker-project'));
  const streamNode = tar.pack(path.join(__dirname, 'fixtures', 'node-project'));

  // options base
  const optionsBase = {
    method: 'POST',
    url: '/deploy',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  tap.test('Should deploy simple docker project', t => {
    const options = Object.assign(optionsBase, {
      payload: streamDocker,
    });

    server.inject(options, async response => {
      const result = response.result;

      // check response
      t.equal(response.statusCode, 200, 'Correct status code');
      t.equal(result.status, 'success', 'Has success status');
      t.ok(result.name.startsWith('exo-admin-test-docker-deploy-'), 'Correct name');

      // check docker services
      const allContainers = await docker.listContainers();
      const container = allContainers.find(c => c.Names.includes(`/${result.name}`));
      const deployId = result.name.split('-').slice(-1).shift();

      t.ok(container, 'Docker has container');
      t.equal(container.Labels['exoframe.deployment'], result.name, 'Should have correct deployment label');
      t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
      t.equal(
        container.Labels['traefik.backend'],
        result.name.replace(`-${deployId}`, ''),
        'Should have correct backend label'
      );
      t.equal(container.Labels['traefik.frontend.rule'], 'Host:localhost', 'Should have correct frontend label');
      t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

      // cleanup
      const instance = docker.getContainer(container.Id);
      await instance.stop();
      await instance.remove();

      t.end();
    });
  });

  tap.test('Should deploy simple node project', t => {
    const options = Object.assign(optionsBase, {
      payload: streamNode,
    });

    server.inject(options, async response => {
      const result = response.result;

      // check response
      t.equal(response.statusCode, 200, 'Correct status code');
      t.equal(result.status, 'success', 'Has success status');
      t.ok(result.name.startsWith('exo-admin-test-node-deploy-'), 'Correct name');

      // check docker services
      const allContainers = await docker.listContainers();
      const container = allContainers.find(c => c.Names.includes(`/${result.name}`));
      const deployId = result.name.split('-').slice(-1).shift();

      t.ok(container, 'Docker has container');
      t.equal(container.Labels['exoframe.deployment'], result.name, 'Should have correct deployment label');
      t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
      t.equal(
        container.Labels['traefik.backend'],
        result.name.replace(`-${deployId}`, ''),
        'Should have correct backend label'
      );
      t.equal(container.Labels['traefik.frontend.rule'], 'Host:localhost', 'Should have correct frontend label');
      t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

      // cleanup
      const instance = docker.getContainer(container.Id);
      await instance.stop();
      await instance.remove();

      t.end();
    });
  });
};
