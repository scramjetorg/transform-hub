# Scramjet Transform Hub Changelog

This is the changelog for Scramjet Transform Hub. It holds only notable commits, others are grouped without commit info.

## [0.34.1] - 2023-05-31

## Fixed

* Fix prerunner, runner image versions by @alicja-gruzdz in https://github.com/scramjetorg/transform-hub/pull/871
* Destroy verser connection by @patuwwy in https://github.com/scramjetorg/transform-hub/pull/869
* Check instance id by @piotrek6641 in https://github.com/scramjetorg/transform-hub/pull/863
* Fixed tags when starting sth with config file by @piotrek6641 in https://github.com/scramjetorg/transform-hub/pull/872

## Features

* New Cli command that allows restarting instance by @piotrek6641 in https://github.com/scramjetorg/transform-hub/pull/861

## [0.34.0] - 2023-05-29

## Fixed

* Fix/workflow warnings by @tomekcrm in https://github.com/scramjetorg/transform-hub/pull/847
* Fix "sequence unpack failed" error with kubernetes by @S4adam in https://github.com/scramjetorg/transform-hub/pull/852
* Fix KeyError on event emit by @gierwialo in https://github.com/scramjetorg/transform-hub/pull/851
* Fix: README help command by @tomekcrm in https://github.com/scramjetorg/transform-hub/pull/859
* STH identifiers by @piotrek6641 in https://github.com/scramjetorg/transform-hub/pull/858
* Bump packages version in bdd directory by @a-tylenda in https://github.com/scramjetorg/transform-hub/pull/864
* Missing handling of disconnect on Id drop by @ErykSol in https://github.com/scramjetorg/transform-hub/pull/866
* Add Patch method to api server by @ErykSol in https://github.com/scramjetorg/transform-hub/pull/867


## Features

* Connect Scramjet Transform Hub to Scramjet Cloud Platform by @patuwwy in https://github.com/scramjetorg/transform-hub/pull/824


## [0.33.5] - 2023-04-19

## Fixed

## What's Changed
* Add missing getLogStream to InstanceClient by @patuwwy in https://github.com/scramjetorg/transform-hub/pull/840
* Catch channel error in SocketServer by @S4adam in https://github.com/scramjetorg/transform-hub/pull/842
* Fix for Hub Client error on Broken Streams by @MichalCz in https://github.com/scramjetorg/transform-hub/pull/843

**Full Changelog**: https://github.com/scramjetorg/transform-hub/compare/v0.33.5...v0.33.5

## [0.33.5] - 2023-04-06

## Fixed

## What's Changed

* Update dependencies v0.33.3 by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/829>
* Remove duplicated method for listing entities by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/831>
* Fix sending topic info by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/833>
* python-runner: replace classic EventEmitter with asynchronous one by @mcdominik in <https://github.com/scramjetorg/transform-hub/pull/832>
* Expose Instance Id in AppContext. by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/837>
* Fix normalize-url for Safari by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/838>

**Full Changelog**: <https://github.com/scramjetorg/transform-hub/compare/v0.33.3...v0.33.5>

## [0.33.3] - 2023-03-16

## Fixed

* Add --debug flag to attach debugger to runner by @S4adam in https://github.com/scramjetorg/transform-hub/pull/808
* Fix/Typedoc settings for client-utils docs generation by @a-tylenda in https://github.com/scramjetorg/transform-hub/pull/823
* cli init sequence by @ErykSol in https://github.com/scramjetorg/transform-hub/pull/807
* si inst inout by @patuwwy in https://github.com/scramjetorg/transform-hub/pull/826

## [0.33.1] - 2023-02-27

## Fixed

* Autodetect runtime adapter when not specifically set by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/795>
* Add CLI docs by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/812>
* Add missing build:docs script by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/813>
* Fixed setting max memory from cli by @mcdominik in <https://github.com/scramjetorg/transform-hub/pull/817>
* Fixed audit stream type by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/819>

## [0.33.0] - 2023-02-23

## Fixed

* Change sequence paths in HostClient tests by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/804>
* Hide `client` field in `HostClient` class. by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/793>
* Readme update by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/794>
* Add host id to logs by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/802>

## Features

* Add audit and log endpoints to cli by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/801>
* cli_docs_generator by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/806>

## [0.32.1] - 2023-01-27

## Fixed

* Clear host in test E2E-007 TC-002 by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/797>
* HostClient declarations for AppContext by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/790>

## [0.32.0] - 2023-01-27

## Features

* Feature runnerjs hostclient by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/789>
* Tests for runnerjs hostclient by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/791>

## Fixed

* Add missing description for `--progress` flag by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/779>
* Fixed missing check for array in the network interfaces by @kociolekscramjet in <https://github.com/scramjetorg/transform-hub/pull/782>
* Edit CLI descriptions by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/780>
* chore(helm): sequencesRoot path as variable by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/785>
* Align Sequences root dir name for all Adapters by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/784>

## [0.31.4] - 2023-01-05

## Fixed

* Fix typo in CLI description by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/773>
* Generate api-client docs by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/774>
* Add logs from loadcheck by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/772>
* Add apibase/entities endpoint by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/771>
* Entities, verser missing methods, types by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/775>
* Fix/topics by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/748>

## [0.31.3] - 2022-12-22

## Fixed

* Fix missing socket methods by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/766>
* Update banner by @S4adam in <https://github.com/scramjetorg/transform-hub/pull/765>
* New banner button text by @S4adam in <https://github.com/scramjetorg/transform-hub/pull/767>

## [0.31.2] - 2022-12-16

## Fixed

* Keep instance failed to start long as other errored instances by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/760>
* Change instance limit error message by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/761>
* Fix missing error reason by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/762>

## [0.31.1] - 2022-12-14

## Fixed

* Fix errored instance status by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/756>

## [0.31.0] - 2022-12-09

## Features

* Get package size information by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/752>

## [0.30.4] - 2022-12-01

## Fixed

* Unhealthy bug by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/745>

## [0.30.3] - 2022-11-17

## Fixed

* Fix changing profiles by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/734>
* Better validation messages with SchemaValidator utility by @kociolekscramjet in <https://github.com/scramjetorg/transform-hub/pull/740>
* Added http url typeguard and validator by @kociolekscramjet in <https://github.com/scramjetorg/transform-hub/pull/742>

## Features

* [CLI] config & profile tests by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/741>

## [0.30.2] - 2022-11-10

## Fixed

* Fix setting platform defaults by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/731>
* Disable Nagle algorithm by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/563>
* Show components id, objects in one line by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/732>

## Features

* `si store` by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/710>

## [0.30.1] - 2022-11-03

## Fixed

* Fix creating profiles by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/726>
* Fix validating ids by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/728>

## Features

* Add SequenceStore operations to ManagerClient by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/727>

## [0.30.0] - 2022-10-28

## Fixed

* Reject topic upstream request with conflicting content-type by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/717>
* Make passing k8s pod limit value quota optional by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/723>

## Features

* Get sequence from SequenceStore if not found locally by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/648>

## [0.29.0] - 2022-10-26

## Fixed

* [CLI] Fix: c pr use config validation by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/712>
* (helm) liveness & readiness probe, fix port mapping by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/714>
* Configuration validation by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/709>
* Fix/eslintup by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/718>

## Features

* Show sequence upload progress in CLI with --progress flag by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/708>
* Check k8s quota before instance start by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/704>
* Remove instance when failed to start by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/711>
* Removing api-client-py by @Tatarinho in <https://github.com/scramjetorg/transform-hub/pull/702>
* (helm) sth support configMap by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/713>
* New instance/inout endpoint by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/628>

## [0.28.5] - 2022-09-28

## Fixed

* Readme code fixing by @S4adam in <https://github.com/scramjetorg/transform-hub/pull/693>
* (feat) transform-hub helm chart by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/689>
* Start host default on :: by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/687>
* Unpipe instance streams when it is ended by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/695>
* Replace localhost with ip (bdd tests) by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/696>
* [CLI] fix loading of broken profile files by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/697>
* Add version to telemetry by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/698>
* Add args field to instance, change sequenceArgs to args in sequences by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/700>
* Add method to get audit stream in MultiManager by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/701>
* [SHN-854] add nodejs 18.x LTS by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/684>
* cli/tests, default to ipv4 by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/690>
* (feat) adds initContainer to helm chart by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/703>

## [0.28.4] - 2022-09-16

## Fixed

* Small fixes by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/680>
* Fix telemetry sizes and environment by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/682>
* Rename Telemetry ENV to the one described in the [SHN-832] task by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/685>
* Instruction fixes by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/675>

## Features

* Allow to merge if target key not exists by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/679>
* [SHN-832] telemetry ENV SCP_ENV_VALUE=GH_CI by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/683>
* Add `getTopics()` method in manager client by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/688>
* [STH] line count and coverage script added by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/686>

## [0.28.3] - 2022-09-09

## Fixed

* [STH] (fix) missing telemetry dependency in Dockerfile

## [0.28.2] - 2022-09-08

## Fixed

* [STH] Unify error responses by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/658>
* Disable Nagle in Runner connections by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/655>
* Fix the dependencies update script by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/660>
* [CLI] fix-reset all not clearing session by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/669>
* Fix: topic data lost by @alicja-gruzdz in <https://github.com/scramjetorg/transform-hub/pull/670>
* Test scenario for topics: completeness of data transmission by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/672>
* Validate topic name by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/625>
* Unpipe input from topic when instance is terminated by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/666>
* [CLI] fix returned exit codes by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/665>
* [STH] Instance stop and kill body params fix by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/673>
* Update main README by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/671>
* (fix) docker compose for sth by @daro1337 in <https://github.com/scramjetorg/transform-hub/pull/674>

### Features

* Loki telemetry adapter by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/632>
* si seq send `<dir>` by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/664>

## [0.28.1] - 2022-08-26

## Fixed

* [STH] Add missing repository field to /sequences by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/653>
* [CLI] display object depth null by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/654>
* [CLI] Fix broken prod_env check by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/659>

## [0.28.0] - 2022-08-18

## Changed

* Rewrite STH-SCP connection by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/617>

## Features

* [CLI] Add session id display by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/633>
* Allow to configure CPMConnector by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/642>
* Add --no-colors flag by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/641>
* Support x-name header on sequence post|put by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/643>

## Fixed

* CLI clean session config on profile change by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/646>
* sth add error msg on invalid instance id by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/647>
* STH add missing sequence info by @ErykSol in <https://github.com/scramjetorg/transform-hub/pull/650>
* Add missing commands to the start snippet by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/636>

## [0.27.0] - 2022-08-11

### Changed

* Update pull_request_template.md by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/614>
* Remove stream object from topics response by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/615>
* Update sinon and tar deps by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/618>
* Change the way of choosing content-type for Python Sequences by @Tatarinho in <https://github.com/scramjetorg/transform-hub/pull/613>
* Allow to send event without payload by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/626>

### Features

* Add yaml loader by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/572>
* Added jsdoc descriptions to middleware-api-client by @kociolekscramjet in <https://github.com/scramjetorg/transform-hub/pull/599>
* [CLI] Add session config display command by @a-tylenda in <https://github.com/scramjetorg/transform-hub/pull/600>

### Fixed

* Fix description in AppContext by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/593>
* Fixing installation of python-runner libs by @Tatarinho in <https://github.com/scramjetorg/transform-hub/pull/609>
* Fix handling binary input by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/612>
* Allow Arrays in AppConfig by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/603>
* Fix delete Sequence with running Instances by @Tatarinho in <https://github.com/scramjetorg/transform-hub/pull/621>
* Use response code if error code not provided in body by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/619>
* Change Stopped / Killed instance status to `completed`, provide exit info by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/622>
* Return 400 if stop request is not valid by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/630>
* Use correct hub in tests by @patuwwy in <https://github.com/scramjetorg/transform-hub/pull/627>
* Fix for #634 by @MichalCz in <https://github.com/scramjetorg/transform-hub/pull/635>

## [0.26.1] - 2022-07-12

### Fixed

* Fix dependencies by @MichalCz in #597

## [0.26.0] - 2022-07-11

### Features

* #570 - allow changing the same operation limits for operation on Raspberry Pi's.

### Fixed

* #578 - fixed docs with better naming conventions
* #585 - fixes in CLI tests and minor improvements
* #570 - fixes path resolution on STH command lines

### Removed

* #580 - removal of refapps in favor of [scramjetorg/reference-apps repo](https://github.com/scramjetorg/reference-apps/)

## Previous releases

### Added

- 6eef4229 - Every topic test scenario starts own host
- eb32427b - Remove unnecessary pipe on adding new topic
- f31916d7 - Fixes for stream ending with `x-stream-end` header.
- ceb4362d - Make `fetchOnlyIfExists` truly optional in docker image pulling procedure.
- 250d9f31 - Fix docker adapter to wait until image pull is finished.
- 547eeb8e - Allow to publish Sequence ports, both TCP and UDP
- 48d59c69 - Temporary restoring wait before detaching endpoint
- 424bd67d - Colorize logger function name, update logs
- da503b9b - Enable starting runner with ts-node in --no-docker mode, which is very useful for development contributors
- 542080ed - Introducing in consistent response type from STH API endpoints, also implementation of type-layer error mechanism for StartSequence and DeleteSequence
- a60bf30e - Added configurable Instance Adapter exit delay to sth config
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
- e89113b2 - CLI: fix for saving Instance id in config
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
- cbebb3e - Docker Runtime Adapter for Python Runner
- 2e0e504 - Added Kubernetes manifests for Transform-Hub deployment on Kubernetes
- 5538ac52 - STH: update docker to bullseye, silent yarn
- 8c54e56e - Restore proper STOP/KILL supervisor mechanisms.
- b214a8d4 - Add HTTPS support to Verser.
- 7f2484f16 - CLI commands for interacting with Scramjet Cloud Platform
- 417685b07 - Switch topic requests to https.
- ac15ee4e4 - Do not close topic when producing output stream is ended.
- 22f1a1656 - Add python3 to STH docker image
- 7417b7a98 - Enable assigning output topic on Sequence start.
- 018e6975d - CLI commands update
- 913b8877 - IaC startup mode (#239)
- 93391784 - Introduce Auditor class to provide audit stream

### Features

- **Topics** - You can now send data to STH without having to have a Sequence
- **Cloud Platform Connection** - Scramjet will allow to connect multiple STH to allow multipoint data sharing between them
- **New Adapters** - New adapters added to Instance and Sequence which doesn't depend on Docker
- **Log endpoint** - New endpoint '/logs' that streams all Instances logs
- **Verser module** - New module for reverse server functionality
- **Comments** - Improved code documentation
- **TCP Runner** - Connection between Runner and Host is replaced from socket to TCP
- **CLI extension** - Last uploaded/added Sequence can now be referenced when starting etc. This will massively improve the CLI experience, as there's no longer need to parse the previous command line if we want to do quick deployment of a Sequence
- **Python runner WIP** - Running STH without docker can now spawn Sequences written in python
- **HTTPS Upgrade** - The API server can now be secured using HTTPS
- **Instance stop improvement** - Support for graceful stop of Instance in Python Runner
- **Typed responses for api-client** - Integrate sapphire fetch wrapper in api-cli
- **Python Runner BDD tests** - Introduce BDD tests for Python Runner
- **PYTHONPATH** - Configured PYTHONPATH for loading dependencies
- **Python Instance events** - Handle Instance events in Python Runner
- **Kubernetes Runtime Adapters** - new Sequence and Instance Adapters allow running programs on Kubernetes
- **Dockerized Python Runner** - Python programs can now be run in Docker containers
- **Reusable topics** - Topic streams don't end when input ends, you can always send more input
- **Python in Docker image** - When running STH from docker image, you will have python installed to run python Sequences inside
- **Infrastructure as Code mode** - allow configuring Sequences that should be started automatically when STH is started.
- **Audit stream** - Adds middleware to Host API Server to intercept all requests and push their details to Audit stream.
- **API client** in Python (basic implemantation).
- **Resource limits** for runner pod in kubernetes adapter.
- **Runner crashlog** - logs from a crashed runner should be available in host, even if the runner crashed before connecting.

### Fixed

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
- Revert appending the Sequence main file extension to Sequence entrypoint in the Runner
- Removing overlapping BDD tests
- Speed up the execution of BDD tests by force-closing Runner in the specific tests
- Improve BDD tests performance by removing explicit waits
- Fix Python logging test
- Upgrade Python installation from `pip install` to `pip3 install`
- Add missing scripts to python-runner
- Fix missing dependencies
- Fix python-runner image in sth-config
- Docker image is built from Debian Bullseye (instead of Buster)
- Fixes providing error details in client-utils
- Fix not passing error from prerunner
- Restore proper STOP/KILL supervisor mechanisms in CSIController
- Dependencies security upgrade
- HTTPS support for connecting to cloud platform manager
- CLI commands for interacting with Scramjet Cloud Platform
- Shell autocompletion for cli
- Session and global configuration for cli
- Encrypt all Host-Manager communication with TLS
- Fix the build scripts of @scramjet/cli so that completion is added
- Add cli utility for coloring JSON logs obtained from remote STH
- Add /config API endpoint for checking STH/Host config
- Fix for adding Python Sequence library to path
- Choosing runner image in kubernetes adapter (so that either python or node runner can be used)
- Provide more information about the service on /version endpoint (service name, commit ID)
- API base url (e.g. the one provided to CLI) is normalized
- Fixes for CLI
- Make version endpoint type consistent
- Fix passing args to Sequence through CLI
- Introduce si seq prune for bulk Sequence removal
- Add docs on how to write a Sequence
- Enable ending input stream through CLI
- Enable closing HTTP connection in API Clients
- Select first healthy hub as default in CLI
- Make rebuilding STH much faster
- Ability to pass a RequestInit object to stream requests in Api clients (Fix ClientUtils for browser)
- Handle async generator in python runner
- Include the original API response status code and message in the api-client error type
- Add sequence add/del, instance start/end status change to audit stream
- Various improvements in CLI output and option handling
- Handle Runner failure and Sequence errors on Sequence start, show errors
- Move (almost all) reference apps to separate repository
- Show more information with `si hub info` command
- Fix CLI output format
- Rewrite build scripts
- Added getSequenceClient and getInstanceClient methods to MiddlewareApiClient
- Exit runner when sequence is damged rather than falling into infinite loop
- Refactor build scripts
- Fix reported instance statuses
- Fix CLI errors on Windows
- AuditStream limit info
- Remove zombie instances
- Update missing types for kill/stop responses
- Restore instances details in /instances endpoint
- Fix si seq prune command
- Fix workflow (npm publish)
- Do not return empty object in get op
- Python runner support for keepalive
- Force killing runner when hanged
- Fix si seq deploy
