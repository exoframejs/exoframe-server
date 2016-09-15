// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

test('Should clean docker image', async (t) => {
  // make sure there's at least one non-tagged image
  const allImagesPre = await docker.listImagesAsync();
  const nonTaggedPre = allImagesPre.filter(img => img.RepoTags.includes('<none>:<none>'));
  t.equal(nonTaggedPre.length, 1, 'Non-tagged image exists');

  // send clean request
  request(app)
    .post('/api/clean')
    .set('x-access-token', app.get('token'))
    .expect(204)
    .end(async (err) => {
      t.error(err, 'No error');

      // make sure the image was really removed
      // get all image
      const allImages = await docker.listImagesAsync();
      const nonTagged = allImages.filter(img => img.RepoTags.includes('<none>:<none>'));
      t.equal(nonTagged.length, 0, 'Non-tagged image does not exist');

      t.end();
    });
});
