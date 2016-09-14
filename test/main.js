/* eslint global-require: 0 */
import {waitForConfig} from '../src/config';

waitForConfig()
.then(() => {
  require('./login');
  require('./error');
  require('./docker-build');
});
