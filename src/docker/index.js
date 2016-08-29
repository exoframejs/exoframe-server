import build from './build';
import list from './list';

export default (app) => {
  build(app);
  list(app);
};
