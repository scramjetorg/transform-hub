# Scramjet Transform Hub Changelog

This is the changelog for Scramjet Transform Hub. It holds only notable commits, others are grouped without commit info.

Prominent

- 6eef4229 - Every topic test scenario starts own host
- eb32427b - Remove unnecessary pipe on adding new topic
- f31916d7 - Fixes for stream ending with `x-stream-end` header.
- ceb4362d - Make `fetchOnlyIfExists` truly optional in docker image pulling procedure.
- 250d9f31 - Fix docker adapter to wait until image pull is finished.
- 547eeb8e - Allow to publish sequence ports, both TCP and UDP
- 48d59c69 - Temporary restoring wait before detaching endpoint
- 424bd67d - Colorize logger function name, update logs
- da503b9b - Enable starting runner with ts-node in --no-docker mode, which is very useful for development contributors
- 542080ed - Introducing in consistent response type from STH API endpoints, also implementation of type-layer error mechanism for StartSequence and DeleteSequence
- a60bf30e - Added configurable instance adapter exit delay to sth config
- 9eb223dc - Improved error handling in api server
- c37bed19 - Reduce size of Common Logs Pipe buffer
- 80c46760 - Improve Dockerfile for runner
- 28cb2bc2 - Replace one multiplex connection with multiple TCP connections between Host and Runner
- e4fdcdde - Add Decorator method in api-server
- 13539c51 - Improved method for stopping Host
- 23b6baaf - Host now communicates with Manager using a Verser module
- 986b9793 - Improved Host logging
- ea5211dc - Runner connects with Host via TCP
- 51310043 - STH CLI extended with a new functionality that replaces the ID number of the last item the user interacted with "-" alias
- 1c4ce2f2 - Reenable STH to be run inside a docker container
- 3f0b4494 - Listen and reconnect on VerserClient error in Host to Manager connection
- d0f7bdc4 - Python runner work in progress
- f0963d02 - Logger upgrade, now it operates on objects not strings
- e89113b2 - CLI: fix for saving instance id in config
- 5217044e - Introduce a new, faster building for development using esbuild
- fe364b1a - Add support for complex packages in python apps
- 2d193278 - Introduce HTTPS support in the API Server
- 38d69826 - The Docker Sequence and Instance Adapters specify the volume permissions
- e46e9d80 - Scramjet community moving to Discord documentation update
- 7dc49fea - Sapphire fetch wrapper integration
- 13d08d36 - BDD tests for Python Runner
- de177100 - Setup for installing dependencies in Python Runner
- d7ae4019 - Implementation of Instance event handling in Python Runner
- f477555 - Transform-Hub supports running programs on Kubernetes cluster
- cbebb3e - Docker support for Python Runner
- 2e0e504 - Kubernetes manifests enabling Transform-Hub deployment on Kubernetes

New features:

- **Topics** - You can now send data to STH without having to have a sequence
- **Cloud Platform Connection** - Scramjet will allow to connect multiple STH to allow multipoint data sharing between them
- **New Adapters** - New adapters added to instance and sequence which doesn't depend on Docker
- **Log endpoint** - New endpoint '/logs' that streams all instances logs
- **Verser module** - New module for reverse server functionality
- **Comments** - Improved code documentation
- **TCP Runner** - Connection between Runner and Host is replaced from socket to TCP
- **CLI extension** - Last uploaded/added sequence can now be referenced when starting etc. This will massively improve the CLI experience, as there's no longer need to parse the previous command line if we want to do quick deployment of a sequence
- **Python runner WIP** - Running STH without docker can now spawn sequences written in python
- **HTTPS Upgrade** - The API server can now be secured using HTTPS
- **Instance stop improvement** - Support for graceful stop of Instance in Python Runner
- **Typed responses for api-client** - Integrate sapphire fetch wrapper in api-cli
- **Python Runner BDD tests** - Introduce BDD tests for Python Runner
- **PYTHONPATH** - Configured PYTHONPATH for loading dependencies
- **Python Instance events** - Handle Instance events in Python Runner
- **Kubernetes Runtime Adapters** - new Sequence and Instance Adapters allow running programs on Kubernetes
- **Dockerized Python Runner** - Python programs can now be run in Docker containers

Bugfixes and minor improvements:

- Fix for spawning runner process
- Container close issues now show not occur
- Introduced fixes that close
- Improved test stability
- Improved Github Actions workflows
- Fix for Service Discovery, where API endpoint '/input' is not blocking after the second PANG message.
- Verify if package exists before sending it to STH
- Fix for STH version unknown from response API endpoint '/version'
- Add missing import in packages/types/sth-rest-api/src/index.ts.
- Fix for dependencies in sth/package.json, types/package.json and bdd/package.json
- Change default STH host from localhost to 0.0.0.0
- Fix for Runner output when output stream is in `{ objectMode: true }`
- Fix for CLI when input is provided from command line
- Fix for log duplication
- Fix process.stdin ending
- Fix STH to be able to run from within a docker container (bugged since 0.13 and TCP Runner)
- STH is able to reconnect to Scramjet Cloud Platform automatically
- Fix for the id replacement in CLI.
- Improved chunk size handling for the input and controls streams in the Python Runner
- Smarter Python Runner selection based on the Sequence configuration
- Sequence configuration can now be provided to Python Sequence on startup
- Python Runner operates on the JSON logs (aligned with the new ObjLogger used in the Host)
- Better error handling in the ObjectLogger and the CommunicationHandler
- Added Docker Sequence and Instance Adapter volume permissions
- Python Runner implements the complete Host handshake (including the default topic messages)
- Fix for starting STH with the identify Sequences flag `-E`
- Fix for deleting Sequence which was causing STH crash
- Fix for starting the Transform-Hub with mutually exclusive runtime adapters options
- Fix for Instance Client response type
- Faster building of the reference apps
- Improvement of 'upgrade:all' script for aligning and updating all dependencies in all packages in the Transform-Hub project
- Simplify usage of fetch and add browser entrypoint in client-utils
- Ensure reinstalling Python dependencies if required
- Add responding to OPTIONS requests and setting CORS in the Transform-Hub API server

## @scramjet/transform Hub - v0.17.0

This is the last release in changelog.
