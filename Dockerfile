FROM alpine

# install required libs
RUN apk update && apk add --no-cache libstdc++ libgcc

# copy binary
COPY exoframe-server /

# expose ports
EXPOSE 8080

# set binary as entry point
ENTRYPOINT ["/exoframe-server"]
