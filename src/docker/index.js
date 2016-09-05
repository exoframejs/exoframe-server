import build from './build';
import images from './images';
import services from './services';
import deploy from './deploy';
import stop from './stop';
import remove from './remove';
import pull from './pull';

export default (app) => {
  build(app);
  images(app);
  services(app);
  deploy(app);
  stop(app);
  remove(app);
  pull(app);
};
