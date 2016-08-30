// npm packages

// our packages
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.get('/api/services', checkAuth, async (req, res) => {
    // get all containers
    const allContainers = await docker.listContainersAsync({all: true});
    const containers = allContainers.filter(c => c.Labels && c.Labels['exoframe.user'] === req.userInfo.username);
    res.send(containers);
  });
};
