// npm modules
const uuid = require('uuid');

// our modules
const docker = require('./docker');
const {getProjectConfig} = require('./util');

module.exports = async ({image, username}) => {
  const baseName = image.split(':').shift();
  const uid = uuid.v1();
  const name = `${baseName}-${uid.split('-').shift()}`;

  // get project info
  const config = getProjectConfig();

  // generate host
  const host = config.domain || 'localhost';

  // generate env vars
  const Env = config.env
    ? Object.keys(config.env).map(key => `${key}=${config.env[key]}`)
    : [];

  // create container
  const container = await docker.createContainer({
    Image: image,
    name,
    Env,
    Labels: {
      'exoframe.deployment': name,
      'exoframe.user': username,
      'traefik.backend': baseName,
      'traefik.frontend.rule': `Host:${host}`,
    },
    HostConfig: {
      RestartPolicy: {
        Name: 'always',
      },
    },
  });

  // start container
  await container.start();

  return container.inspect();
};
