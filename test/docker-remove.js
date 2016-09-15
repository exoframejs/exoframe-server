// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

test('Should remove user service', async (t) => {
  const svc = app.get('service');

  // stop service
  await docker.getContainer(svc.Id).stopAsync();

  // send remove request
  request(app)
    .post(`/api/remove/${svc.Id.slice(0, 12)}`)
    .set('x-access-token', app.get('token'))
    .expect(204)
    .end(async (err) => {
      t.error(err, 'No error');

      // make sure the container was really removed
      // get all containers
      const allContainers = await docker.listContainersAsync({all: true});
      const container = allContainers.find(c => c.Id === svc.Id);
      t.notOk(container, 'Container does not exists');

      t.end();
    });
});
