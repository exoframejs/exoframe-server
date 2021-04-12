FROM node:lts-alpine

# install docker-compose
RUN apk add --no-cache --update python3-dev libffi-dev openssl-dev gcc libc-dev rust cargo make
RUN python3 -m pip install -U pip
RUN pip3 install cryptography==3.1.1
RUN pip3 install docker-compose

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
