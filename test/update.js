// npm packages
const tap = require('tap');

// our packages
const docker = require('../src/docker/docker');
const {pullImage} = require('../src/docker/init');

module.exports = (server, token) =>
  new Promise(async resolve => {
    // pull older traefik image
    const traefikTag = 'traefik:1.3-alpine';
    // remove current traefik:latest image
    // pull older traefik image
    await pullImage(traefikTag);
    // get all images
    const images = await docker.listImages();
    // remove current :latest image
    const latestTraefik = images.find(img => img.RepoTags.includes('traefik:latest'));
    const limg = docker.getImage(latestTraefik.Id);
    await limg.remove();
    // get old one and tag it as latest
    const oldTraefik = images.find(img => img.RepoTags.includes(traefikTag));
    const img = docker.getImage(oldTraefik.Id);
    await img.tag({repo: 'traefik', tag: 'latest'});

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
        const newTraefik = allImages.find(it => it.RepoTags.includes('traefik:latest'));
        t.notEqual(newTraefik.Id, oldTraefik.Id, 'Should have updated traefik image');

        // cleanup
        const allContainers = await docker.listContainers();
        const container = allContainers.find(
          c => c.Image === 'traefik:latest' && c.Names.find(n => n === '/exoframe-traefik')
        );
        const instance = docker.getContainer(container.Id);
        await instance.stop();
        await instance.remove();

        t.end();
      });
    });

    tap.test('End', t => {
      resolve();
      t.end();
    });
  });
