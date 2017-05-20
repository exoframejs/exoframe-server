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
        t.equal(result.deployments.length, 1, 'Should have one deployment');
        t.ok(result.deployments[0].Name.startsWith('/exo-admin-test-docker-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const containerInfo = allContainers.find(c => c.Names.includes(result.deployments[0].Name));
        const deployId = result.deployments[0].Name.split('-').slice(-1).shift();
        const name = result.deployments[0].Name.slice(1);

        t.ok(containerInfo, 'Docker has container');
        t.equal(containerInfo.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(containerInfo.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerInfo.Labels['traefik.backend'],
          name.replace(`-${deployId}`, ''),
          'Should have correct backend label'
        );
        t.equal(
          containerInfo.Labels['traefik.frontend.rule'],
          `Host:${name}.test`,
          'Should have correct frontend label'
        );
        t.ok(containerInfo.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

        const containerData = docker.getContainer(containerInfo.Id);
        const container = await containerData.inspect();
        // console.log(JSON.stringify(container));
        t.ok(container.NetworkSettings.Networks.exoframe.Aliases.includes('test'), 'Should have correct hostname');
        t.deepEqual(
          container.HostConfig.RestartPolicy,
          {Name: 'no', MaximumRetryCount: 0},
          'Should have correct restart policy'
        );

        // cleanup
        const instance = docker.getContainer(containerInfo.Id);
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
        t.equal(result.deployments.length, 1, 'Should have one deployment');
        t.ok(result.deployments[0].Name.startsWith('/exo-admin-test-node-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(result.deployments[0].Name));
        const name = result.deployments[0].Name.slice(1);
        const deployId = name.split('-').slice(-1).shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Labels['traefik.backend'],
          name.replace(`-${deployId}`, ''),
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
        t.equal(result.deployments.length, 1, 'Should have one deployment');
        const name = result.deployments[0].Name.slice(1);
        t.ok(name.startsWith('exo-admin-test-html-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${name}`));
        const deployId = name.split('-').slice(-1).shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Labels['traefik.backend'],
          name.replace(`-${deployId}`, ''),
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
        t.equal(result.deployments.length, 2, 'Should have two deployments');
        t.ok(result.deployments[0].Name.startsWith('/exo-admin-test-compose-deploy-web-'), 'Correct first name');
        t.ok(result.deployments[1].Name.startsWith('/exo-admin-test-compose-deploy-redis-'), 'Correct second name');

        // check docker services
        const allContainers = await docker.listContainers();
        const containerOne = allContainers.find(c => c.Names.includes(result.deployments[0].Name));
        const containerTwo = allContainers.find(c => c.Names.includes(result.deployments[1].Name));
        const nameOne = result.deployments[0].Name.slice(1);
        const nameTwo = result.deployments[1].Name.slice(1);
        const deployIdOne = nameOne.split('-').slice(-1).shift();
        const deployIdTwo = nameTwo.split('-').slice(-1).shift();

        t.ok(containerOne, 'Docker has container one');
        t.ok(containerTwo, 'Docker has container two');
        t.equal(containerOne.Labels['exoframe.deployment'], nameOne, 'Should have correct deployment label');
        t.equal(containerTwo.Labels['exoframe.deployment'], nameTwo, 'Should have correct deployment label');
        t.equal(containerOne.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(containerTwo.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerOne.Labels['traefik.backend'],
          nameOne.replace(`-${deployIdOne}`, ''),
          'Should have correct backend label'
        );
        t.equal(
          containerTwo.Labels['traefik.backend'],
          nameTwo.replace(`-${deployIdTwo}`, ''),
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
