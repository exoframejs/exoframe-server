// npm packages
const tap = require('tap');

// our packages
const docker = require('../src/docker/docker');
const {pullImage} = require('../src/docker/init');

module.exports = (server, token) =>
  new Promise(async resolve => {
    // pull older traefik image
    const traefikTag = 'traefik:1.3-alpine';
    const serverTag = 'exoframe/server:develop';
    // remove current images
    // get all images
    const oldImages = await docker.listImages();
    // remove current :latest images
    const latestTraefik = oldImages.find(img => img.RepoTags && img.RepoTags.includes('traefik:latest'));
    if (latestTraefik) {
      const limg = docker.getImage(latestTraefik.Id);
      await limg.remove();
    }
    const latestServer = oldImages.find(img => img.RepoTags && img.RepoTags.includes('exoframe/server:latest'));
    if (latestServer) {
      const lsimg = docker.getImage(latestServer.Id);
      await lsimg.remove();
    }
    // pull older images
    await pullImage(traefikTag);
    await pullImage(serverTag);
    // get all images
    const images = await docker.listImages();
    // get old one and tag it as latest
    const oldTraefik = images.find(img => img.RepoTags && img.RepoTags.includes(traefikTag));
    const timg = docker.getImage(oldTraefik.Id);
    await timg.tag({repo: 'traefik', tag: 'latest'});
    const oldServer = images.find(img => img.RepoTags && img.RepoTags.includes(serverTag));
    const simg = docker.getImage(oldServer.Id);
    await simg.tag({repo: 'exoframe/server', tag: 'latest'});

    // start old server instance
    const srvConfig = {
      Image: 'exoframe/server:latest',
      name: `exoframe-server-test`,
      Env: ['test=var'],
      Labels: {test: 'label'},
      HostConfig: {
        Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
      },
    };
    // start server
    const oldServerContainer = await docker.createContainer(srvConfig);
    await oldServerContainer.start();

    // run update test
    tap.test('Should update traefik', t => {
      // options base
      const options = {
        method: 'POST',
        url: '/update/traefik',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
        // check response
        t.equal(response.statusCode, 200, 'Correct status code');

        // check docker services
        const allImages = await docker.listImages();
        const newTraefik = allImages.find(it => it.RepoTags && it.RepoTags.includes('traefik:latest'));
        t.notEqual(newTraefik.Id, oldTraefik.Id, 'Should have updated traefik image');

        t.end();
      });
    });

    // run update test
    tap.test('Should update server', t => {
      // options base
      const options = {
        method: 'POST',
        url: '/update/server',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, async response => {
        // check response
        t.equal(response.statusCode, 200, 'Correct status code');

        // check docker services
        const allImages = await docker.listImages();
        const newServer = allImages.find(it => it.RepoTags && it.RepoTags.includes('exoframe/server:latest'));
        t.notEqual(newServer.Id, oldServer.Id, 'Should have updated exoframe/server image');

        // cleanup
        const allContainers = await docker.listContainers({all: true});
        const containerTraefik = allContainers.find(c => c.Names.find(n => n === '/exoframe-traefik'));
        const containerServer = allContainers.find(
          c => c.Image === 'exoframe/server:latest' && c.Names.find(n => n.startsWith('/exoframe-server'))
        );
        const srvInst = docker.getContainer(containerServer.Id);
        await srvInst.remove({force: true});
        const trInst = docker.getContainer(containerTraefik.Id);
        await trInst.remove({force: true});

        t.end();
      });
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
