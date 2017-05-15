// npm packages
const tap = require('tap');

// our packages
const docker = require('../src/docker/docker');
const initDocker = require('../src/docker/init');

module.exports = () => {
  tap.test('Should deploy simple docker project', t => {
    const run = async () => {
      // remove any existing containers first
      const initialContainers = await docker.listContainers({all: true});
      // try to find traefik instance
      const traefik = initialContainers.find(
        c => c.Image === 'traefik:latest' && c.Names.find(n => n === '/exoframe-traefik')
      );
      // if found - stop/remove
      if (traefik) {
        const traefikContainer = docker.getContainer(traefik.Id);
        if (!traefik.Status.includes('Exited')) {
          await traefikContainer.stop();
        }
        await traefikContainer.remove();
      }

      // call init
      await initDocker();

      // check docker services
      const allContainers = await docker.listContainers();
      const container = allContainers.find(
        c => c.Image === 'traefik:latest' && c.Names.find(n => n === '/exoframe-traefik')
      );

      t.ok(container, 'Docker has container');
      t.equal(container.Names[0], '/exoframe-traefik', 'Should have correct name');
      t.equal(container.Labels['exoframe.deployment'], 'exo-traefik', 'Should have correct deployment label');
      t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
      t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');
      t.equal(container.Ports.length, 1, 'Should have one port binding');
      t.equal(container.Ports[0].PrivatePort, 80, 'Should have correct private port binding');
      t.equal(container.Ports[0].PublicPort, 80, 'Should have correct public port binding');
      t.equal(container.Mounts[0].Destination, '/var/run/docker.sock', 'Should have correct first mount');
      t.equal(container.Mounts[1].Destination, '/var/acme', 'Should have correct second mount');

      // cleanup
      const instance = docker.getContainer(container.Id);
      await instance.stop();
      await instance.remove();

      t.end();
    };

    run();
  });
};
