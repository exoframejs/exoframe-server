const user = {
  username: 'plugin',
  password: '123',
};

module.exports = {
  authenticate({username, password}) {
    return new Promise((resolve) => {
      if (username === user.username && password === user.password) {
        resolve({user});
      } else {
        resolve({error: 'Incorrect username or password!'});
      }
    });
  },
};
