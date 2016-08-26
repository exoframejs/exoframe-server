// npm packages
import test from 'tape';

// load tests
import register from './register';
import login from './login';

// execute tests
register(test);
login(test);
