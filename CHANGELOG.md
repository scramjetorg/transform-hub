# Scramjet Transform Hub Changelog

This is the changelog for Scramjet Transform Hub. It holds only notable commits, others are grouped without commit info.

Prominent

* da503b9b - Enable starting runner with ts-node in --no-docker mode, which is very useful for development contributors
* 542080ed - Introducing in consistent response type from STH API endpoints, also implementation of type-layer error mechanism for StartSequence and DeleteSequence
* a60bf30e - Added configurable instance adapter exit delay to sth config
* 9eb223dc - Improved error handling in api server
* c37bed19 - Reduce size of Common Logs Pipe buffer
* 80c46760 - Improve Dockerfile for runner

New features:

* **New Adapters** - New adapters added to instance and sequence which doesn't depend on Docker
* **Log endpoint** - New endpoint '/logs' that streams all instances logs

Bugfixes:

* Fix for Service Discovery, where API endpoint '/input' is not blocking after the second PANG message.
* Verify if package exists before sending it to STH
* Fix for STH version unknown from response API endpoint '/version'.


## @scramjet/transform Hub - v0.13.0

This is the last release in changelog.
