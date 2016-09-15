// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should get user images', (t) => {
  request(app)
    .get('/api/images')
    .set('x-access-token', app.get('token'))
    .expect(200)
    .end((err, res) => {
      t.error(err, 'No error');

      // make sure newly built image is included in the list
      const images = res.body;
      t.equal(images.length, 2, 'Two images');
      const img = images.find(image => image.RepoTags[0] === 'exoframe-test:latest');
      t.ok(img, 'Image exists');
      t.ok(img.Labels['exoframe.user'] === app.get('user').username, 'Correct image owner');
      t.ok(img.Labels['test.label'] === '1', 'Correct test label');

      t.end();
    });
});

test('Should not get user images without authentication', (t) => {
  request(app)
    .get('/api/images')
    .expect(403)
    .end((err, res) => {
      t.error(err, 'No error');
      t.equal(res.body.error, 'No auth token given! Please login first.', 'Correct error message');
      t.end();
    });
});
