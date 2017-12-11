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
    const streamHtmlUpdate = tar.pack(path.join(__dirname, 'fixtures', 'html-project'));
    const streamCompose = tar.pack(path.join(__dirname, 'fixtures', 'compose-project'));
    const streamComposeUpdate = tar.pack(path.join(__dirname, 'fixtures', 'compose-project'));
    const streamBrokenDocker = tar.pack(path.join(__dirname, 'fixtures', 'broken-docker-project'));
    const streamBrokenNode = tar.pack(path.join(__dirname, 'fixtures', 'broken-node-project'));
    const streamAdditionalLabels = tar.pack(path.join(__dirname, 'fixtures', 'additional-labels'));

    // options base
    const optionsBase = {
      method: 'POST',
      url: '/deploy',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // storage vars
    let simpleHtmlInitialDeploy = '';
    let composeDeployOne = '';
    let composeDeployTwo = '';

    tap.test('Should deploy simple docker project', t => {
      const options = Object.assign(optionsBase, {
        payload: streamDocker,
      });

      server.inject(options, async response => {
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(deployments.length, 1, 'Should have one deployment');
        t.ok(deployments[0].Name.startsWith('/exo-admin-test-docker-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const containerInfo = allContainers.find(c => c.Names.includes(deployments[0].Name));
        const deployId = deployments[0].Name
          .split('-')
          .slice(-1)
          .shift();
        const name = deployments[0].Name.slice(1);

        t.ok(containerInfo, 'Docker has container');
        t.equal(containerInfo.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(containerInfo.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(containerInfo.Labels['exoframe.project'], 'test-project', 'Should have correct project label');
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
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(deployments.length, 1, 'Should have one deployment');
        t.ok(deployments[0].Name.startsWith('/exo-admin-test-node-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(deployments[0].Name));
        const name = deployments[0].Name.slice(1);
        const deployId = name
          .split('-')
          .slice(-1)
          .shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          container.Labels['exoframe.project'],
          name.replace(`-${deployId}`, ''),
          'Should have correct project label'
        );
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
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(deployments.length, 1, 'Should have one deployment');
        const name = deployments[0].Name.slice(1);
        t.ok(name.startsWith('exo-admin-test-html-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${name}`));
        const deployId = name
          .split('-')
          .slice(-1)
          .shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(container.Labels['exoframe.project'], 'simple-html', 'Should have correct project label');
        t.equal(
          container.Labels['traefik.backend'],
          name.replace(`-${deployId}`, ''),
          'Should have correct backend label'
        );
        t.notOk(container.Labels['traefik.frontend.rule'], 'Should not have frontend label');
        t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

        // store initial deploy id
        simpleHtmlInitialDeploy = container.Id;

        t.end();
      });
    });

    tap.test('Should update simple HTML project', t => {
      const options = Object.assign(optionsBase, {
        url: '/update',
        payload: streamHtmlUpdate,
      });

      server.inject(options, async response => {
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(deployments.length, 1, 'Should have one deployment');
        const name = deployments[0].Name.slice(1);
        t.ok(name.startsWith('exo-admin-test-html-deploy-'), 'Correct name');

        // check docker services
        const allContainers = await docker.listContainers();
        const container = allContainers.find(c => c.Names.includes(`/${name}`));
        const deployId = name
          .split('-')
          .slice(-1)
          .shift();

        t.ok(container, 'Docker has container');
        t.equal(container.Labels['exoframe.deployment'], name, 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(container.Labels['exoframe.project'], 'simple-html', 'Should have correct project label');
        t.equal(
          container.Labels['traefik.backend'],
          name.replace(`-${deployId}`, ''),
          'Should have correct backend label'
        );
        t.notOk(container.Labels['traefik.frontend.rule'], 'Should not have frontend label');
        t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');

        // get old container
        try {
          const oldInstance = docker.getContainer(simpleHtmlInitialDeploy);
          await oldInstance.inspect();
        } catch (e) {
          t.ok(e.toString().includes('no such container'), 'Old container should not exist');
        }

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
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(deployments.length, 2, 'Should have two deployments');
        t.ok(deployments[0].Name.startsWith('/exo-admin-test-compose-deploy-web-'), 'Correct first name');
        t.ok(deployments[1].Name.startsWith('/exo-admin-test-compose-deploy-redis-'), 'Correct second name');

        // check docker services
        const allContainers = await docker.listContainers();
        const containerOne = allContainers.find(c => c.Names.includes(deployments[0].Name));
        const containerTwo = allContainers.find(c => c.Names.includes(deployments[1].Name));
        const nameOne = deployments[0].Name.slice(1);
        const nameTwo = deployments[1].Name.slice(1);
        const deployIdOne = nameOne
          .split('-')
          .slice(-1)
          .shift();
        const deployIdTwo = nameTwo
          .split('-')
          .slice(-1)
          .shift();

        t.ok(containerOne, 'Docker has container one');
        t.ok(containerTwo, 'Docker has container two');
        t.equal(containerOne.Labels['exoframe.deployment'], nameOne, 'Should have correct deployment label');
        t.equal(containerTwo.Labels['exoframe.deployment'], nameTwo, 'Should have correct deployment label');
        t.equal(containerOne.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(containerTwo.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerOne.Labels['exoframe.project'],
          nameOne.replace(`-web-${deployIdOne}`, ''),
          'Should have correct project label'
        );
        t.equal(
          containerTwo.Labels['exoframe.project'],
          nameTwo.replace(`-redis-${deployIdTwo}`, ''),
          'Should have correct project label'
        );
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

        // store ids for update test
        composeDeployOne = containerOne.Id;
        composeDeployTwo = containerTwo.Id;

        t.end();
      });
    });

    tap.test('Should update simple compose project', t => {
      const options = Object.assign(optionsBase, {
        url: '/update',
        payload: streamComposeUpdate,
      });

      server.inject(options, async response => {
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(deployments.length, 2, 'Should have two deployments');
        t.ok(deployments[0].Name.startsWith('/exo-admin-test-compose-deploy-web-'), 'Correct first name');
        t.ok(deployments[1].Name.startsWith('/exo-admin-test-compose-deploy-redis-'), 'Correct second name');

        // check docker services
        const allContainers = await docker.listContainers();
        const containerOne = allContainers.find(c => c.Names.includes(deployments[0].Name));
        const containerTwo = allContainers.find(c => c.Names.includes(deployments[1].Name));
        const nameOne = deployments[0].Name.slice(1);
        const nameTwo = deployments[1].Name.slice(1);
        const deployIdOne = nameOne
          .split('-')
          .slice(-1)
          .shift();
        const deployIdTwo = nameTwo
          .split('-')
          .slice(-1)
          .shift();

        t.ok(containerOne, 'Docker has container one');
        t.ok(containerTwo, 'Docker has container two');
        t.equal(containerOne.Labels['exoframe.deployment'], nameOne, 'Should have correct deployment label');
        t.equal(containerTwo.Labels['exoframe.deployment'], nameTwo, 'Should have correct deployment label');
        t.equal(containerOne.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(containerTwo.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.equal(
          containerOne.Labels['exoframe.project'],
          nameOne.replace(`-web-${deployIdOne}`, ''),
          'Should have correct project label'
        );
        t.equal(
          containerTwo.Labels['exoframe.project'],
          nameTwo.replace(`-redis-${deployIdTwo}`, ''),
          'Should have correct project label'
        );
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

        // get old containers
        try {
          const oldInstance = docker.getContainer(deployIdOne);
          await oldInstance.inspect();
        } catch (e) {
          t.ok(e.toString().includes('no such container'), 'Old container one should not exist');
        }
        try {
          const oldInstance = docker.getContainer(deployIdTwo);
          await oldInstance.inspect();
        } catch (e) {
          t.ok(e.toString().includes('no such container'), 'Old container two should not exist');
        }

        t.end();
      });
    });

    tap.test('Should display error log for broken docker project', t => {
      const options = Object.assign(optionsBase, {
        payload: streamBrokenDocker,
      });

      server.inject(options, async response => {
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // get last error
        const error = result.pop();

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(error.message, 'Build failed! See build log for details.', 'Has correct message');
        t.equal(error.log[0], 'Step 1/3 : FROM busybox\n', 'Has correct build log line 1');
        t.ok(error.log.find(l => l === 'Step 2/3 : RUN exit 1\n'), 'Has correct exit build log line');
        t.equal(
          error.log[error.log.length - 1],
          "The command '/bin/sh -c exit 1' returned a non-zero code: 1",
          'Has correct build log last line'
        );

        // clean all exited containers
        const allContainers = await docker.listContainers({all: true});
        const exitedWithError = allContainers.filter(c => c.Status.includes('Exited (1)'));
        await Promise.all(exitedWithError.map(c => docker.getContainer(c.Id)).map(c => c.remove()));

        t.end();
      });
    });

    tap.test('Should display error log for broken Node.js project', t => {
      const options = Object.assign(optionsBase, {
        payload: streamBrokenNode,
      });

      server.inject(options, async response => {
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // get last error
        const error = result.pop();

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');
        t.equal(error.message, 'Build failed! See build log for details.', 'Has correct message');
        t.equal(error.log[0], 'Step 1/8 : FROM node:latest\n', 'Has correct first log line');
        t.ok(error.log.find(l => l === 'Step 2/8 : RUN mkdir -p /usr/src/app\n'), 'Has correct mkdir log line');
        t.equal(
          error.log[error.log.length - 1],
          "The command '/bin/sh -c npm install --silent' returned a non-zero code: 1",
          'Has correct last log line'
        );

        // clean all exited containers
        const allContainers = await docker.listContainers({all: true});
        const exitedWithError = allContainers.filter(c => c.Status.includes('Exited (1)'));
        await Promise.all(exitedWithError.map(c => docker.getContainer(c.Id)).map(c => c.remove()));

        t.end();
      });
    });

    tap.test('Should have additional labels', t => {
      const options = Object.assign(optionsBase, {
        payload: streamAdditionalLabels,
      });

      server.inject(options, async response => {
        // parse result into lines
        const result = response.result
          .split('\n')
          .filter(l => l && l.length)
          .map(line => JSON.parse(line));

        // find deployments
        const deployments = result.find(it => it.deployments && it.deployments.length).deployments;

        // check response
        t.equal(response.statusCode, 200, 'Correct status code');



        // check docker services
        const allContainers = await docker.listContainers();
        const containerInfo = allContainers.find(c => c.Names.includes(deployments[0].Name));
        t.ok(containerInfo, 'Docker has container');
        t.equal(containerInfo.Labels['custom.label'], "additional-label", 'Should have label `custom.label=additional-label`');
        
        t.end();
      });
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
