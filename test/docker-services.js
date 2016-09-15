// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should get all user services', (t) => {
  request(app)
    .get('/api/services')
    .set('x-access-token', app.get('token'))
    .expect(200)
    .end(async (err, res) => {
      t.error(err, 'No error');

      // make sure the service was started with right params
      const services = res.body;
      t.equal(services.length, 1, 'One container');
      const svc = services[0];
      t.ok(svc, 'Service exists');
      t.equal(svc.Image, 'exoframe-test:latest', 'Correct image');
      t.equal(svc.Labels['exoframe.user'], 'admin', 'Correct user');

      t.end();
    });
});
