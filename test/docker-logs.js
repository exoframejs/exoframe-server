// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should get logs from user service', (t) => {
  const svc = app.get('service');

  request(app)
    .get(`/api/logs/${svc.Id.slice(0, 12)}`)
    .set('x-access-token', app.get('token'))
    .expect(200)
    .end((err, res) => {
      t.error(err, 'No error');

      // make sure the container logs are correct
      const logs = res.text;
      const cleanLogs = logs.replace(/[\u0001\u0000\u0004]/g, '').split('\n').filter(line => line.length > 0);
      t.deepEqual(cleanLogs, ['123', '123'], 'Logs are correct');

      t.end();
    });
});
