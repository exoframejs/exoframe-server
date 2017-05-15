const _ = require('lodash');
const jwt = require('jsonwebtoken');
const hapiAuthJWT = require('hapi-auth-jwt');

const {auth} = require('../../config');
const {getConfig} = require('../config');

const validate = (request, decodedToken, callback) => {
  const credentials = getConfig().users.find(
    u => u.username === decodedToken.username
  );

  if (!credentials) {
    return callback(null, false, credentials);
  }

  return callback(null, true, credentials);
};

module.exports = server =>
  new Promise(resolve => {
    server.register(hapiAuthJWT, () => {
      server.auth.strategy('token', 'jwt', {
        key: auth.privateKey,
        validateFunc: validate,
        verifyOptions: {algorithms: ['HS256']}, // only allow HS256 algorithm
      });

      server.route({
        method: 'GET',
        path: '/checkToken',
        config: {auth: 'token'},
        handler(request, reply) {
          const replyObj = {
            message: 'Token is valid',
            credentials: _.omit(request.auth.credentials, ['password']),
          };
          reply(replyObj);
        },
      });

      server.route({
        method: 'POST',
        path: '/login',
        config: {auth: false},
        handler(request, reply) {
          const users = getConfig().users;
          const reqUser = request.payload;
          const user = users.find(
            u =>
              u.username === reqUser.username && u.password === reqUser.password
          );

          if (!user) {
            reply({error: 'Incorrect username or password!'}).code(401);
            return;
          }

          const fetchedUser = _.omit(user, ['password']);
          const token = jwt.sign(fetchedUser, auth.privateKey, {
            algorithm: 'HS256',
          });
          reply({token, user: fetchedUser});
        },
      });

      resolve(server);
    });
  });
