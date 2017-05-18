// npm packages
const tap = require('tap');
const path = require('path');
const tar = require('tar-fs');

// our packages
const docker = require('../src/docker/docker');

module.exports = (server, token) =>
  new Promise(async resolve => {
    // create tar streams
    const streamDocker = tar.pack(path.join(__dirname, 'fixtures', 'docker-project'));
    const streamNode = tar.pack(path.join(__dirname, 'fixtures', 'node-project'));
    const streamHtml = tar.pack(path.join(__dirname, 'fixtures', 'html-project'));
    const streamCompose = tar.pack(path.join(__dirname, 'fixtures', 'compose-project'));

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
        t.equal(result.names.length, 1, 'Should have one deployment');
        t.ok(result.names[0].startsWith('exo-admin-test-docker-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${result.names[0]}`));
        const deployId = result.names[0].split('-').slice(-1).shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], result.names[0], 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Labels['traefik.backend'],
          result.names[0].replace(`-${deployId}`, ''),
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
        t.equal(result.names.length, 1, 'Should have one deployment');
        t.ok(result.names[0].startsWith('exo-admin-test-node-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${result.names[0]}`));
        const deployId = result.names[0].split('-').slice(-1).shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], result.names[0], 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Labels['traefik.backend'],
          result.names[0].replace(`-${deployId}`, ''),
          'Should have correct backend label'
        );
        t.equal(container.Labels['traefik.frontend.rule'], 'Host:localhost', 'Should have correct frontend label');
        t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

        // this deployment is not cleaned up
        // it will be used in following list/remove tests

        t.end();
      });
    });

    tap.test('Should deploy simple HTML project', t => {
      const options = Object.assign(optionsBase, {
        payload: streamHtml,
      });

      server.inject(options, async response => {
        const result = response.result;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(result.status, 'success', 'Has success status');
        t.equal(result.names.length, 1, 'Should have one deployment');
        t.ok(result.names[0].startsWith('exo-admin-test-html-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${result.names[0]}`));
        const deployId = result.names[0].split('-').slice(-1).shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], result.names[0], 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Labels['traefik.backend'],
          result.names[0].replace(`-${deployId}`, ''),
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

    tap.test('Should deploy simple compose project', t => {
      const options = Object.assign(optionsBase, {
        payload: streamCompose,
      });

      server.inject(options, async response => {
        const result = response.result;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(result.status, 'success', 'Has success status');
        t.equal(result.names.length, 2, 'Should have two deployments');
        t.ok(result.names[0].startsWith('exo-admin-test-compose-deploy-web-'), 'Correct first name');
        t.ok(result.names[1].startsWith('exo-admin-test-compose-deploy-redis-'), 'Correct second name');

        // check docker services
        const allContainers = await docker.listContainers();
        const containerOne = allContainers.find(c => c.Names.includes(`/${result.names[0]}`));
        const containerTwo = allContainers.find(c => c.Names.includes(`/${result.names[1]}`));
        const deployIdOne = result.names[0].split('-').slice(-1).shift();
        const deployIdTwo = result.names[1].split('-').slice(-1).shift();

        t.ok(containerOne, 'Docker has container one');
        t.ok(containerTwo, 'Docker has container two');
        t.equal(containerOne.Labels['exoframe.deployment'], result.names[0], 'Should have correct deployment label');
        t.equal(containerTwo.Labels['exoframe.deployment'], result.names[1], 'Should have correct deployment label');
        t.equal(containerOne.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(containerTwo.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerOne.Labels['traefik.backend'],
          result.names[0].replace(`-${deployIdOne}`, ''),
          'Should have correct backend label'
        );
        t.equal(
          containerTwo.Labels['traefik.backend'],
          result.names[1].replace(`-${deployIdTwo}`, ''),
          'Should have correct backend label'
        );
        t.equal(containerOne.Labels['traefik.frontend.rule'], 'Host:test.dev', 'Should have correct frontend label');
        t.ok(containerOne.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');
        t.ok(containerTwo.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

        // cleanup
        const instanceOne = docker.getContainer(containerOne.Id);
        await instanceOne.stop();
        await instanceOne.remove();
        const instanceTwo = docker.getContainer(containerTwo.Id);
        await instanceTwo.stop();
        await instanceTwo.remove();

        t.end();
      });
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
