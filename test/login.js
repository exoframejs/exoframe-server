// npm packages
import test from 'tape';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// our packages
import app from '../src/app';
import {auth as authConfig} from '../config';

test('Should login with admin username and password', (t) => {
  request(app)
    .post('/api/login')
    .send({username: 'admin', password: 'admin'})
    .expect(200)
    .expect('Content-Type', /json/)
    .end((err, res) => {
      const actualBody = res.body;

      t.error(err, 'No error');
      t.ok(actualBody.user, 'User exists');
      t.ok(actualBody.token, 'Token exists');

      const decodedUser = jwt.verify(actualBody.token, authConfig.jwtSecret);
      delete decodedUser.iat;
      delete decodedUser.exp;

      t.equal(actualBody.user.username, 'admin', 'Login matches request');
      t.notOk(actualBody.user.password, 'No password included');
      t.deepEqual(actualBody.user, decodedUser, 'User must match token');

      app.set('token', actualBody.token);
      app.set('user', actualBody.user);

      t.end();
    });
});

test('Should login with plugin username and password', (t) => {
  request(app)
    .post('/api/login')
    .send({username: 'plugin', password: '123'})
    .expect(200)
    .expect('Content-Type', /json/)
    .end((err, res) => {
      const actualBody = res.body;

      t.error(err, 'No error');
      t.ok(actualBody.user, 'User exists');
      t.ok(actualBody.token, 'Token exists');

      const decodedUser = jwt.verify(actualBody.token, authConfig.jwtSecret);
      delete decodedUser.iat;
      delete decodedUser.exp;

      t.equal(actualBody.user.username, 'plugin', 'Login matches request');
      t.notOk(actualBody.user.password, 'No password included');
      t.deepEqual(actualBody.user, decodedUser, 'User must match token');

      t.end();
    });
});

test('Should not login with non-existing user', (t) => {
  request(app)
    .post('/api/login')
    .send({username: 'dont', password: 'exist'})
    .expect(401)
    .expect('Content-Type', /json/)
    .end((err, res) => {
      t.error(err, 'No error');
      t.equal(res.body.error, 'Incorrect username or password!', 'Correct error message');
      t.end();
    });
});
