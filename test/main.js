/* eslint global-require: 0 */
import {waitForConfig} from '../src/config';

waitForConfig()
.then(() => {
  require('./login');
  require('./error');
  require('./docker-build');
  require('./docker-images');
  require('./docker-deploy');
  require('./docker-services');
  require('./docker-stop');
  require('./docker-start');
  require('./docker-inspect');
  require('./docker-remove');
});
