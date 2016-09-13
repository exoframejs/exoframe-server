import build from './build';
import images from './images';
import services from './services';
import deploy from './deploy';
import stop from './stop';
import start from './start';
import remove from './remove';
import pull from './pull';
import logs from './logs';
import inspect from './inspect';

export default (app) => {
  build(app);
  images(app);
  services(app);
  deploy(app);
  stop(app);
  start(app);
  remove(app);
  pull(app);
  logs(app);
  inspect(app);
};
