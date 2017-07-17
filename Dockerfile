FROM alpine

# install required libs
RUN apk update && apk add --no-cache libstdc++ libgcc py-pip && pip install docker-compose

# copy binary
COPY exoframe-server /

# set environment to production
ENV NODE_ENV production

# expose ports
EXPOSE 8080

# set binary as entry point
ENTRYPOINT ["/exoframe-server"]
