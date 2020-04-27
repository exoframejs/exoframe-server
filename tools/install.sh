#!/bin/bash

source "getopts_long.bash"

FILE=$HOME/.exoframe/server.config.yml
DRY_RUN=0

while getopts_long 'Dhe:d:p: dry-run help email: domain: password:' OPTKEY; do
    case ${OPTKEY} in
        'D'|'dry-run')
            DRY_RUN=1
            ;;
        'e'|'email')
            ssl=$OPTARG
            ;;
        'd'|'domain')
            domain=$OPTARG
            ;;
        'p'|'password')
            passvar=$OPTARG
            ;;
        '?'|'h'|'help')
            echo -e "$(c G)Usage:$(c)"
            echo -e "  -D, --dry-run     $(c G)Dry run. Print command instead of executiing it$(c)"
            echo -e "  -e, --email       $(c G)Enter email to enable SSL support.$(c)"
            echo -e "  -d, --domain      $(c G)Enter exoframe-server domain.$(c)"
            echo -e "  -p, --password    $(c G)Enter your private key used for JWT encryption.$(c)"
            exit 0
            ;;
        ':')
            echo -e "$(c R)MISSING ARGUMENT for option -- ${OPTARG}$(c)" >&2
            exit 1
            ;;
        *)
            echo -e "$(c R)Misconfigured OPTSPEC or uncaught option -- ${OPTKEY}$(c)" >&2
            exit 1
            ;;
    esac
done

shift $(( OPTIND - 1 ))
[[ "${1}" == "--" ]] && shift

if [ ! $domain ]; then
    read -p "Enter exoframe-server domain: " domain
fi
if [ ! -f "$FILE" ] && [ ! $ssl ]; then
    read -p "Enter email to enable SSL support: " ssl
fi
if [ ! $passvar ]; then
    read -sp "Enter your private key used for JWT encryption: " passvar
fi

VAR="docker run -d \
-v /var/run/docker.sock:/var/run/docker.sock \
-v $HOME/.exoframe:/root/.exoframe \
-v $HOME/.ssh/authorized_keys:/root/.ssh/authorized_keys:ro \
-e EXO_PRIVATE_KEY=$passvar \
--label traefik.enable=true \
--label traefik.http.routers.exoframe-server.rule=Host(\`exoframe.$domain\`)"

if [ $ssl ]; then
    if [ $DRY_RUN -eq 0 ]; then
        mkdir -p $(dirname $FILE) && touch $FILE
        echo "letsencrypt: true" >> $FILE
        echo "letsencryptEmail: $ssl" >> $FILE
    fi
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

if [ $DRY_RUN -eq 1 ]; then
    echo
    echo
    echo -e "$(c G)Command to run inside server:$(c)"
    if [ $ssl ]; then
        echo
        echo -e "$(c R)mkdir -p $(dirname $FILE) && touch $FILE$(c)"
        echo -e "$(c R)echo \"letsencrypt: true\" >> $FILE$(c)"
        echo -e "$(c R)echo \"letsencryptEmail: $ssl\" >> $FILE$(c)"
    fi
    echo
    echo -e "$(c R)$VAR$(c)"
else
    $VAR
fi
