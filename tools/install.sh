#!/bin/bash

read -p 'Enable ssl? Pres Enter for none: ' ssl
read -p 'Enter your server domain: ' domain
read -p 'Enter /path/to/exoframe-folder should be path on your server: ' config
read -p 'Enter /home/user/.ssh/authorized_keys should point to your authorized_keys file: ' ssh
read -sp 'Enter your private key used for JWT encryption: ' passvar

VAR="docker run -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-v $config:/root/.exoframe \
-v $ssh/authorized_keys:/root/.ssh/authorized_keys:ro \
-e EXO_PRIVATE_KEY=$passvar \
--label traefik.enable=true \
--label traefik.http.routers.exoframe-server.rule=Host(\`exoframe.$domain\`)"

if [ $ssl ]; then
    VAR+=" \
--label traefik.http.routers.exoframe-server-web.rule=Host(\`exoframe.$domain\`) \
--label traefik.http.routers.exoframe-server.tls.certresolver=exoframeChallenge \
--label traefik.http.middlewares.exoframe-server-redirect.redirectscheme.scheme=https \
--label traefik.http.routers.exoframe-server-web.entrypoints=web \
--label traefik.http.routers.exoframe-server-web.middlewares=exoframe-server-redirect@docker \
--label traefik.http.routers.exoframe-server.entrypoints=websecure \
--label entryPoints.web.address=:80 \
--label entryPoints.websecure.address=:443"
fi

VAR+=" \
--restart always \
--name exoframe-server \
exoframe/server"

$VAR