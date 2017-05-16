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
