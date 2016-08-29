import build from './build';
import list from './list';
import deploy from './deploy';

export default (app) => {
  build(app);
  list(app);
  deploy(app);
};
