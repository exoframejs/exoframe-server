// npm packages
import request from 'supertest';

// our packages
import app from '../src/app';

export default (test) => {
  test('Should register with given username and password', (t) => {
    request(app)
      .post('/api/register')
      .send({username: 'test', password: '123'})
      .expect(201)
      .end((err) => {
        t.error(err, 'No error');
        t.end();
      });
  });

  test('Should register second user with given username and password', (t) => {
    request(app)
      .post('/api/register')
      .send({username: 'other', password: '321'})
      .expect(201)
      .end((err) => {
        t.error(err, 'No error');
        t.end();
      });
  });

  test('Should fail to register with same username', (t) => {
    request(app)
      .post('/api/register')
      .send({username: 'test', password: 'aaa'})
      .expect(403)
      .end((err, res) => {
        const expectedBody = {error: 'User with given username already exists!'};
        const actualBody = res.body;

        t.error(err, 'No error');
        t.deepEqual(actualBody, expectedBody, 'Retrieve body');
        t.end();
      });
  });
};
