// npm modules
const fetch = require('node-fetch');
const cmp = require('semver-compare');

// our modules
const docker = require('../docker/docker');
const pkg = require('../../package.json');

// urls for tags request
const exoServerUrl = `https://api.github.com/repos/exoframejs/exoframe-server/releases`;
const traefikUrl = 'https://api.github.com/repos/containous/traefik/releases';
const traefikVersionPrefix = 'v1.7';

const getLatestVersion = async (url, versionPrefix) => {
  const res = await fetch(url).then(r => r.json());
  const latestRelease = res
    // filter out drafts and pre-releases
    .filter(r => !r.draft && !r.prerelease)
    // if version prefix is provided - filter out releases that don't match it
    .filter(r => (versionPrefix ? r.tag_name.startsWith(versionPrefix) : true))
    .shift();
  return latestRelease.tag_name;
};

module.exports = fastify => {
  fastify.route({
    method: 'GET',
    path: '/version',
    async handler(request, reply) {
      try {
        // get version of traefik
        let traefikVersion = 'none';
        const allImages = await docker.listImages();
        const traefik = allImages.find(img => img.RepoTags && img.RepoTags.find(t => t.includes('traefik')));
        if (traefik) {
          traefikVersion =
            traefik.Labels['org.label-schema.version'] || traefik.Labels['org.opencontainers.image.version'];
        }
        // get latest versions
        const lastServerTag = await getLatestVersion(exoServerUrl);
        const lastTraefikTag = await getLatestVersion(traefikUrl, traefikVersionPrefix);
        // reply
        reply.code(200).send({
          server: pkg.version,
          latestServer: lastServerTag,
          serverUpdate: cmp(lastServerTag, pkg.version) > 0,
          traefik: traefikVersion,
          latestTraefik: lastTraefikTag,
          traefikUpdate: cmp(lastTraefikTag, traefikVersion) > 0,
        });
      } catch (error) {
        reply.code(500).send({error});
      }
    },
  });
};
