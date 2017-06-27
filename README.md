# Exoframe Server (beta)

> Power armor for docker containers

[![Build Status](https://gitlab.com/exoframejs/exoframe-server/badges/master/build.svg)](https://gitlab.com/exoframejs/exoframe-server/pipelines)
[![coverage report](https://gitlab.com/exoframejs/exoframe-server/badges/master/coverage.svg)](https://gitlab.com/exoframejs/exoframe-server/commits/master)
[![Docker Pulls](https://img.shields.io/docker/pulls/exoframe/server.svg?maxAge=2592000)](https://hub.docker.com/r/exoframe/server/)
[![Docker image size](https://images.microbadger.com/badges/image/exoframe/server.svg)](https://microbadger.com/images/exoframe/server)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg?maxAge=2592000)](https://opensource.org/licenses/MIT)

## How it works

Exoframe intends to do all the heavy lifting required to build and deploy web services for you.  
To run it you need two parts - [Exoframe CLI](https://github.com/exoframejs/exoframe) and Exoframe server.

Exoframe automatically detects your project type, builds and deploys it to the server using [Docker](https://www.docker.com/) and [Traefik](https://github.com/containous/traefik).  
After running exoframe, the only thing you need to do is wait a few seconds until your files have been built or deployed!

[Read more about Exoframe and how it works in the main repo](https://github.com/exoframejs/exoframe).

## Installation and Usage

1. Make sure you have Docker [installed and running](https://docs.docker.com/engine/installation/) on your host.
2. Pull and run Exoframe server using docker:

```sh
docker run -d \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /path/to/exoframe-folder:/root/.exoframe \
  -v /home/user/.ssh/authorized_keys:/root/.ssh/authorized_keys:ro \
  -e EXO_PRIVATE_KEY=your_private_key \
  --label traefik.backend=exoframe-server \
  --label traefik.frontend.rule=Host:exoframe.your-host.com \
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

3. Edit config file to fit your needs (see section below)

Then grab [Exoframe CLI](https://github.com/exoframejs/exoframe), point it to your new Exoframe server and use it.

## Configuration

Exoframe stores its config in `~/.exoframe/server.config.yml`.  
Currently it contains list of users for basic auth, debug and letsencrypt settings:

```yaml
debug: false # whether debug mode is enabled, default "false"
letsencrypt: false # whether to enable letsencrypt, default "false"
letsencryptEmail: your@email.com # email used for letsencrypt
publicKeysPath: '/path/to/your/public/keys' # path to folder with authorized_keys, default "~/.ssh"
```

## Contribute

1. Fork this repository to your own GitHub account and then clone it to your local device.
2. Install dependencies: `yarn`
3. Execute tests to make sure everything's working: `yarn test`
4. Start the server: `yarn start`

Now can point your Exoframe CLI to `http://localhost:8080` and use it.

## License

Licensed under MIT.
