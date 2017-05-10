// npm modules
const Docker = require('dockerode');

// create new docker instance
const docker = new Docker(); // defaults to above if env variables are not used

module.exports = docker;
