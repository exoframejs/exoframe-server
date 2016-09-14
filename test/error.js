// npm packages
import test from 'tape';
import request from 'supertest';

// our packages
import app from '../src/app';

test('Should throw error on wrong route', (t) => {
  request(app)
    .get('/i-do-no-exist')
    .expect(404)
    .end((err, res) => {
      t.error(err, 'No error');
      t.equal(res.text, 'Cannot GET /i-do-no-exist\n', 'Correct error message');
      t.end();
    });
});
