// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';
import docker from '../src/docker/docker';

test('Should remove user image', async (t) => {
  const img = app.get('image');

  request(app)
    .post(`/api/image/remove/${img.Id.slice(0, 12)}`)
    .set('x-access-token', app.get('token'))
    .expect(204)
    .end(async (err) => {
      t.error(err, 'No error');

      // make sure the image was really removed
      // get all image
      const allImages = await docker.listImagesAsync();
      const image = allImages.find(c => c.Id === img.Id);
      t.notOk(image, 'Image does not exists');

      t.end();
    });
});
