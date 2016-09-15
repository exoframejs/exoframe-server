# Exoframe Server (alpha)

> Power armor for docker containers

[![Build Status](https://travis-ci.org/exoframejs/exoframe-server.svg?branch=master)](https://travis-ci.org/exoframejs/exoframe-server)

[![asciicast](https://asciinema.org/a/85060.png)](https://asciinema.org/a/85060)

## How it works

Exoframe intends to do all the heavy lifting required to build and deploy docker images for you.
To run it you need two parts - [Exoframe CLI](https://github.com/exoframejs/exoframe) and Exoframe server.

It will detect your project type, pick fitting Dockerfile, ignore files that are not needed (e.g. logs, local build artifacts, etc), tag your image, add labels that reflect your ownership and much more.  
All of this happens completely automatically. So after running the command, the only thing you need to do is wait a few seconds until your files have been built or deployed!

[Read more about Exoframe in main repo](https://github.com/exoframejs/exoframe).

## Installation and Usage

1. Make sure you have docker running on your host.
2. Pull and run Exoframe server using docker:

```
docker run -d \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /path/to/exoframe-folder:/root/.exoframe \
  exoframe/server
```

Then grab [Exoframe CLI](https://github.com/exoframejs/exoframe), point it to your new Exoframe server and use it.

## Configuration

Exoframe stores its config in `~/.exoframe/server.config.yml`.  
Currently it contains list of users for basic auth and list of plugins to be used:

```yaml
users: # list of users for basic auth
  - username: admin # default admin user
    password: admin
    admin: true

plugins: # list of plugins, currently only auth plugins are supported
  auth: # list of auth plugins
    - my-auth-npm-package # you can use npm package name here
    - my-git-plugin: git+https://u:pwd@githost.com/user/my-git-plugin.git # you can also use git npm packages
```

## Contribute

1. Fork this repository to your own GitHub account and then clone it to your local device.
2. Install dependencies: `npm install`
3. Start the server: `npm start`

Now can point your Exoframe CLI to `http://localhost:3000` and use it.

## License

Licensed under MIT.
