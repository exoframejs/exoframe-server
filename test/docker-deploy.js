// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

test('Should deploy test image', (t) => {
  const services = [{
    name: 'exoframe-test:latest',
    ports: ['8888:8888'],
    labels: [{key: 'deploy.label', value: '1'}],
    env: ['DEPLOY_ENV=1'],
    restart: {
      name: 'on-failure',
      retries: 2,
    },
    volumes: ['/tmp:/tmp:ro'],
    // TODO: test links
    // links: [],
  }];

  request(app)
    .post('/api/deploy')
    .set('x-access-token', app.get('token'))
    .send({services})
    .expect(200)
    .end(async (err, res) => {
      t.error(err, 'No error');

      // make sure the service was started with right params
      const containers = res.body;
      t.equal(containers.length, 1, 'One container');
      const svc = containers[0];
      t.ok(svc, 'Service exists');

      // find container in docker
      const container = docker.getContainer(svc.id);
      const data = await container.inspectAsync();
      t.ok(data, 'Container data exists');

      // make sure deployed parameters are correct
      // check image
      t.equal(data.Config.Image, services[0].name, 'Correct image');
      // check ports
      const containerPort = Object.keys(data.HostConfig.PortBindings)[0];
      const hostPort = data.HostConfig.PortBindings[containerPort][0].HostPort;
      t.equal(`${containerPort}:${hostPort}`, services[0].ports[0], 'Correct ports');
      // check labels
      const labels = Object.keys(data.Config.Labels).map(key => ({key, value: data.Config.Labels[key]}));
      const deployLabel = labels.find(l =>
        l.key === services[0].labels[0].key &&
        l.value === services[0].labels[0].value
      );
      t.ok(deployLabel, 'Correct deploy label');
      // check env
      const env = data.Config.Env.find(envVar => envVar === services[0].env[0]);
      t.ok(env, 'Correct environmental var');
      // check restart policy
      const restartPolicy = {
        name: data.HostConfig.RestartPolicy.Name,
        retries: data.HostConfig.RestartPolicy.MaximumRetryCount,
      };
      t.deepEqual(restartPolicy, services[0].restart, 'Correct restart policy');
      // check volumes
      t.deepEqual(data.HostConfig.Binds, services[0].volumes, 'Has volumes');

      t.end();
    });
});
