// npm packages
const tap = require('tap');

// our packages
const docker = require('../src/docker/docker');
const {initDocker} = require('../src/docker/init');

module.exports = () =>
  new Promise(resolve => {
    tap.test('Should deploy traefik', t => {
      const run = async () => {
        // remove any existing containers first
        const initialContainers = await docker.listContainers({all: true});
        // try to find traefik instance
        const traefik = initialContainers.find(c => c.Names.find(n => n === '/exoframe-traefik'));
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
        const container = allContainers.find(c => c.Names.find(n => n === '/exoframe-traefik'));

        t.ok(container, 'Docker has container');
        t.equal(container.Names[0], '/exoframe-traefik', 'Should have correct name');
        t.equal(container.Labels['exoframe.deployment'], 'exo-traefik', 'Should have correct deployment label');
        t.equal(container.Labels['exoframe.user'], 'admin', 'Should have correct user label');
        t.ok(container.NetworkSettings.Networks.exoframe, 'Should be in exoframe network');
        t.equal(container.Ports.length, 2, 'Should have two port bindings');
        t.ok(container.Ports.find(p => p.PrivatePort === 443), 'Should have correct private port 443 binding');
        t.ok(container.Ports.find(p => p.PublicPort === 443), 'Should have correct public port 443 binding');
        t.ok(container.Ports.find(p => p.PrivatePort === 80), 'Should have correct private port 80 binding');
        t.ok(container.Ports.find(p => p.PublicPort === 80), 'Should have correct public port 80 binding');
        t.ok(container.Mounts.find(m => m.Destination === '/var/run/docker.sock'), 'Should have correct first mount');
        t.ok(container.Mounts.find(m => m.Destination === '/var/acme'), 'Should have correct second mount');

        // cleanup
        const instance = docker.getContainer(container.Id);
        await instance.stop();
        await instance.remove();

        t.end();
      };

      run();
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
