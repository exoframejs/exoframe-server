FROM docker/compose:1.24.0

# install required libs and yarn
RUN apk update && apk add --no-cache libstdc++ libgcc yarn

# copy binary
COPY exoframe-server /

# set environment to production
ENV NODE_ENV production

# expose ports
EXPOSE 8080

# set binary as entry point
ENTRYPOINT ["/exoframe-server"]
