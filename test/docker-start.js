// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

test('Should start user service', (t) => {
  const svc = app.get('service');

  request(app)
    .post(`/api/start/${svc.Id.slice(0, 12)}`)
    .set('x-access-token', app.get('token'))
    .expect(204)
    .end(async (err) => {
      t.error(err, 'No error');

      // make sure the container was really started
      // get all containers
      const allContainers = await docker.listContainersAsync({all: true});
      const container = allContainers.find(c => c.Id === svc.Id);
      t.ok(container, 'Container exists');
      t.equal(container.State, 'running', 'Container running');
      t.ok(container.Status.includes('Up'), 'Container is up');

      t.end();
    });
});
