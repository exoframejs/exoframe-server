// npm packages
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';

// our packages
import logger from './logger';

// express routes
import auth from './auth';
import docker from './docker';

// init server
const app = express();
// setup logging
app.use(morgan('combined', {stream: logger.stream}));
// add body parsing
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

// setup routes
auth(app);
docker(app);

// error handling inside of express
app.use((err, req, res, next) => { // eslint-disable-line
  // send error to subject
  logger.error('Server error:', err);
  // dispatch status
  res.status(500).send(err);
});

export default app;
