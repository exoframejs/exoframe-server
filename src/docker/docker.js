// replace promises with bluebird
import Bluebird from 'bluebird';
import Docker from 'dockerode';

// promisify
Bluebird.promisifyAll(Docker.prototype);

// create new docker instance
const docker = new Docker(); // defaults to above if env variables are not used

// promisify network
const network = docker.getNetwork('promisify-net');
Bluebird.promisifyAll(network.constructor.prototype);
// promisify container
const container = docker.getContainer('promisify-container');
Bluebird.promisifyAll(container.constructor.prototype);
// promisify image
const image = docker.getImage('promisify-image');
Bluebird.promisifyAll(image.constructor.prototype);

export default docker;
