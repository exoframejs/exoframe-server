// npm packages
import tar from 'tar-fs';
import path from 'path';
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

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
    req.end(async (err) => {
      t.error(err, 'No error');

      // get all docker images and make sure new one was correctly built
      const allImages = await docker.listImagesAsync();
      const image = allImages.find(img =>
        img.Labels['exoframe.user'] === app.get('user').username &&
        img.Labels['test.label'] === '1' &&
        img.RepoTags[0] === 'exoframe-test:latest'
      );
      t.ok(image, 'Image exists');

      t.end();
    });
  });
});

test('Should not build docker project without tag', (t) => {
  request(app)
    .post('/api/build')
    .set('x-access-token', app.get('token'))
    .expect(400)
    .end((err) => {
      t.error(err, 'No error');
      t.end();
    });
});
