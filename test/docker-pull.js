// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should pull given image', (t) => {
  request(app)
    .get('/api/pull')
    .query({image: 'busybox'})
    .set('x-access-token', app.get('token'))
    .expect(200)
    .end(async (err, res) => {
      t.error(err, 'No error');

      // make sure that busybox was really pulled
      const log = res.text;
      t.ok(log.includes('Image is up to date for busybox:latest'), 'Image pulled');

      t.end();
    });
});
