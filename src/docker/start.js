// npm modules
const uuid = require('uuid');

// our modules
const docker = require('./docker');

module.exports = async ({image, username}) => {
  const baseName = image.split(':').shift();
  const uid = uuid.v1();
  const name = `${baseName}-${uid.split('-').shift()}`;

  // create container
  const container = await docker.createContainer({
    Image: image,
    name,
    Labels: {
      'exoframe.deployment': name,
      'exoframe.user': username,
      'traefik.backend': baseName,
      'traefik.frontend.rule': 'Host:localhost',
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
