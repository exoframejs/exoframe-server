
0.10.1 / 2017-06-29
==================

Changes:
  * Replace gitlab-ci with travis

Fixes:
  * Fix node dockerfile and use npm to start app

0.10.0 / 2017-06-28
==================

Changes:
  * Use private-public RSA key pairs instead of plain-text credentials for auth

Fixes:
  * Only use yarn for node projects if yarn.lock is present

0.9.0 / 2017-05-20
==================

Additions:
  * Allow enabling autoconstructed domains for deployments
  * Allow specifying internal hostnames for deployments

Changes:
  * Get all containers for all commands
  * Change list output to include extended deployment info
  * Return extended info for deployments
  * Set NODE_ENV to production within docker

Fixes:
  * Only stop non-running containers during remove

0.8.1 / 2017-05-18
==================

Fixes:
  * Fix issue when removing/getting logs for nonexistent deployments
  * Fix on-failure restart policy parsing

0.8.0 / 2017-05-18
==================

Additions:
  * Use on-failure restart policy instead of always one
  * Add method to get logs and tests for it
  * Use gitlab-ci to build slim pkg based docker images, closes #3

Changes:
  * Replace travis-ci with gitlab-ci
  * Clarify deployment arguments in README
  * Use node:alpine as base image

Fixes:
  * Only append non-empty messages to build log
  
0.7.0 / 2017-05-17
==================

Full rewrite, beta version.

* Simplified deployment procedure
* Autoconfigurable Traefik reverse-proxy
* Docker-compose support
* Letsencrypt support

0.6.0 / 2016-09-16
==================

Additions:
  * Add clean method that removes all untagged docker images
  * Add method to remove images
  * Add method to inspect containers
  * Add method to start containers
  * Add method to get container logs
  * Add unit tests and test coverage

Changes:
  * Enforce current user info during build
  * Better build test completion validation

Fixes:
  * Do not build without tag, correctly catch issues with parsing of labels during build

0.5.0 / 2016-09-08
==================

  * Filter out non-named images for deploy
  * Add way to link containers during deployment

0.4.0 / 2016-09-05
==================

Additions:
  * Allow pulling and listing images from registries
  * Allow stopping and removing containers

Fixes:
  * Expose ports during deploy to forward them correctly
  * Correctly handle deployment of registry images
