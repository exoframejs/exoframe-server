# Exoframe Server (beta)

> Power armor for docker containers

[![Build Status](https://travis-ci.org/exoframejs/exoframe-server.svg?branch=master)](https://travis-ci.org/exoframejs/exoframe-server)
[![Coverage Status](https://coveralls.io/repos/github/exoframejs/exoframe-server/badge.svg?branch=master)](https://coveralls.io/github/exoframejs/exoframe-server?branch=master)
[![Docker Pulls](https://img.shields.io/docker/pulls/exoframe/server.svg?maxAge=2592000)](https://hub.docker.com/r/exoframe/server/)
[![Docker image size](https://images.microbadger.com/badges/image/exoframe/server.svg)](https://microbadger.com/images/exoframe/server)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)

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
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /path/to/exoframe-folder:/root/.exoframe \
  --label traefik.backend=exoframe-server \
  --label traefik.frontend.rule=Host:exoframe.your-host.com \
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
```

## Contribute

1. Fork this repository to your own GitHub account and then clone it to your local device.
2. Install dependencies: `npm install`
3. Execute tests to make sure everything's working: `npm test`
4. Start the server: `npm start`

Now can point your Exoframe CLI to `http://localhost:8080` and use it.

## License

Licensed under MIT.
