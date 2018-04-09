# Exoframe Server

> Simple Docker deployment tool

[![Build Status](https://travis-ci.org/exoframejs/exoframe-server.svg?branch=master)](https://travis-ci.org/exoframejs/exoframe-server)
[![Coverage Status](https://coveralls.io/repos/github/exoframejs/exoframe-server/badge.svg?branch=master)](https://coveralls.io/github/exoframejs/exoframe-server?branch=master)
[![Docker Pulls](https://img.shields.io/docker/pulls/exoframe/server.svg)](https://hub.docker.com/r/exoframe/server/)
[![Docker image size](https://images.microbadger.com/badges/image/exoframe/server.svg)](https://microbadger.com/images/exoframe/server)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://opensource.org/licenses/MIT)

Exoframe is a self-hosted tool that allows simple one-command deployments using Docker.

## Installation and Usage

1.  Make sure you have Docker [installed and running](https://docs.docker.com/engine/installation/) on your host.
2.  Pull and run Exoframe server using docker:

```sh
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /path/to/exoframe-folder:/root/.exoframe \
  -v /home/user/.ssh/authorized_keys:/root/.ssh/authorized_keys:ro \
  -e EXO_PRIVATE_KEY=your_private_key \
  --label traefik.backend=exoframe-server \
  --label traefik.frontend.rule=Host:exoframe.your-host.com \
  --restart always \
  --name exoframe-server \
  exoframe/server

# Explanation for arguments:
# this allows Exoframe to access your docker
-v /var/run/docker.sock:/var/run/docker.sock

# /path/to/exoframe-folder should be path on your server
# to desired folder that'll hold Exoframe configs
-v /path/to/exoframe-folder:/root/.exoframe

# /home/user/.ssh/authorized_keys should point to your authorized_keys file
# for SSH that holds allowed public keys
-v /home/user/.ssh/authorized_keys:/root/.ssh/authorized_keys:ro

# this is your private key used for JWT
-e EXO_PRIVATE_KEY=your_private_key

# this is used to tell traefik to which deployment current docker service belongs
--label traefik.backend=exoframe-server

# this is used to tell traefik on which domain should Exoframe server be listening
--label traefik.frontend.rule=Host:exoframe.your-host.com
```

3.  Edit config file to fit your needs (see section below)

Then install [Exoframe CLI](https://github.com/exoframejs/exoframe), point it to your new Exoframe server and use it.

## Installation and usage in Swarm mode

Exoframe also supports running in [Swarm mode](https://docs.docker.com/engine/swarm/).  
To run Exoframe server in swarm, you need to do the following:

1.  Make sure you have Docker on your host.
2.  Make sure your Docker has [Swarm mode enabled](https://docs.docker.com/engine/swarm/swarm-tutorial/create-swarm/).
3.  Pull and run Exoframe server using Docker on your manager node:

```
docker service create \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  --mount type=bind,source=/path/to/exoframe-folder,target=/root/.exoframe \
  --mount type=bind,source=/home/user/.ssh/authorized_keys,target=/root/.ssh/authorized_keys,readonly \
  -e EXO_PRIVATE_KEY=your_private_key \
  --label traefik.backend=exoframe-server \
  --label traefik.frontend.rule=Host:exoframe.your-host.com \
  --label traefik.port=8080 \
  --constraint=node.role==manager \
  --name exoframe-server \
  exoframe/server
```

Note that both Exoframe server and Traefik will be run on your manager node.

## Configuration

Exoframe stores its config in `~/.exoframe/server.config.yml`.  
Currently it contains the following settings:

```yaml
# whether debug mode is enabled, default "false"
debug: false

# whether to enable letsencrypt, default "false"
letsencrypt: false

# email used for letsencrypt
letsencryptEmail: your@email.com

# whether to apply gzip compression, default "true"
compress: true

# base top-level domain to use for deployments without domains specified, default "false"
# used as postfix, e.g. if you specify ".example.com" (dot is auto-prepended if not present)
# all your deployments will be autodeployed as "deployment-id.example.com"
baseDomain: false

# CORS support; can be "true" ("*" header) or object with "origin" property, default "false"
cors: false

# Traefik image to be used; set to "false" to disable traefik management, default "traefik:latest"
traefikImage: 'traefik:latest'

# Traefik container name, default "exoframe-traefik"
traefikName: 'exoframe-traefik'

# Additional Traefik start args, default []
traefikArgs: []

# Network used by traefik to connect services to, default "exoframe"
exoframeNetwork: 'exoframe'

# server image update channel; can be "stable" or "nightly", default "stable"
updateChannel: 'stable'

# path to folder with authorized_keys, default "~/.ssh"
publicKeysPath: '/path/to/your/public/keys'
```

_Warning:_ Most changes to config are applied immediately. With exception of Letsencrypt config. If you are enabling letsencrypt after Traefik instance has been started, you'll need to remove Traefik and then restart Exoframe server for changes to take effect.

## Docs

[Read more about Exoframe and how it works in the main repo](https://github.com/exoframejs/exoframe).

## License

Licensed under MIT.
