FROM node:lts-alpine

# install docker-compose
RUN apk add curl
RUN curl -L --fail https://github.com/docker/compose/releases/download/1.29.0/run.sh -o /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose

# create new workdir
WORKDIR /app

# copy source
COPY bin/ /app

# set environment to production
ENV NODE_ENV production

# expose ports
EXPOSE 8080

# set binary as entry point
CMD ["node", "exoframe-server.js"]
