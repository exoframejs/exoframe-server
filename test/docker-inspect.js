// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should inspect user service', (t) => {
  const svc = app.get('service');

  request(app)
    .get(`/api/inspect/${svc.Id.slice(0, 12)}`)
    .set('x-access-token', app.get('token'))
    .expect(200)
    .end(async (err, res) => {
      t.error(err, 'No error');

      // make sure the container info is correct
      const inspect = res.body;
      t.equal(svc.Id, inspect.Id, 'Same ID');
      t.equal(svc.Names[0], inspect.Name, 'Same name');
      t.equal(svc.Image, inspect.Config.Image, 'Same image');
      t.deepEqual(svc.Labels, inspect.Config.Labels, 'Same labels');

      t.end();
    });
});
