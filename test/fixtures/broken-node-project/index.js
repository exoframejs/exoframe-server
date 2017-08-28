const {join} = require('path');
const Git = require('nodegit');

const run = async () => {
  const repo = await Git.Repository.open(join(__dirname, '..', '..', '..'));
  const masterCommit = await repo.getMasterCommit();

  // log end
  console.log('Done!', masterCommit);
};

run();
