import build from './build';
import images from './images';
import services from './services';
import deploy from './deploy';

export default (app) => {
  build(app);
  images(app);
  services(app);
  deploy(app);
};
