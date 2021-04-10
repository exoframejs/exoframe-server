FROM node:lts-alpine

# install docker-compose
RUN apk add --no-cache --update python3-dev py-pip
RUN python3 -m pip install -U pip
RUN apk add --no-cache --update gcc musl-dev python3-dev libffi-dev libc-dev openssl-dev rust cargo make
RUN pip install cryptography==3.1.1
RUN pip install docker-compose

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
