// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

test('Should stop user service', (t) => {
  const svc = app.get('service');

  request(app)
    .post(`/api/stop/${svc.Id.slice(0, 12)}`)
    .set('x-access-token', app.get('token'))
    .expect(204)
    .end(async (err) => {
      t.error(err, 'No error');

      // make sure the container was really stopped
      // get all containers
      const allContainers = await docker.listContainersAsync({all: true});
      const container = allContainers.find(c => c.Id === svc.Id);
      t.ok(container, 'Container exists');
      t.equal(container.State, 'exited', 'Container exited');
      t.ok(container.Status.includes('Exited (0)'), 'Exited with code 0');

      t.end();
    });
});
