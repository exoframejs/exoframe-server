#!/bin/sh

FILE=$HOME/.exoframe/server.config.yml

read -p 'Enter exoframe-server domain: ' domain
if [ ! -f "$FILE" ]; then
    read -p 'Enter email to enable SSL support: ' ssl
fi
read -sp 'Enter your private key used for JWT encryption: ' passvar

VAR="docker run -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-v $HOME/.exoframe:/root/.exoframe \
-v $HOME/.ssh/authorized_keys:/root/.ssh/authorized_keys:ro \
-e EXO_PRIVATE_KEY=$passvar \
--label traefik.enable=true \
--label traefik.http.routers.exoframe-server.rule=Host(\`exoframe.$domain\`)"

if [ $ssl ]; then
    echo "letsencrypt: true" > $FILE
    echo "letsencryptEmail: $ssl" >> $FILE

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