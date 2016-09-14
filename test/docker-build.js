// npm packages
import tar from 'tar-fs';
import path from 'path';
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should build docker project', (t) => {
  const stream = tar.pack(path.join(__dirname, 'fixtures', 'docker-project'));

  const req = request(app)
    .post('/api/build')
    .query({tag: 'exoframe-test', labels: JSON.stringify({'test.label': '1'})})
    .set('x-access-token', app.get('token'))
    .expect(200);
  const s = stream.pipe(req);
  // wait for upload stream to end
  s.on('end', () => {
    // this is required for supertest to end correctly
    req.end((err) => {
      t.error(err, 'No error');
      t.end();
    });
  });
});
