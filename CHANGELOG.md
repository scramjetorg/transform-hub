# Scramjet Transform Hub Changelog

This is the changelog for Scramjet Transform Hub. It holds only notable commits, others are grouped without commit info.

Prominent

-   6eef4229 - Every topic test scenario starts own host
-   eb32427b - Remove unnecessary pipe on adding new topic
-   f31916d7 - Fixes for stream ending with `x-stream-end` header.
-   ceb4362d - Make `fetchOnlyIfExists` truly optional in docker image pulling procedure.
-   250d9f31 - Fix docker adapter to wait until image pull is finished.
-   547eeb8e - Allow to publish sequence ports, both TCP and UDP
-   48d59c69 - Temporary restoring wait before detaching endpoint
-   424bd67d - Colorize logger function name, update logs
-   da503b9b - Enable starting runner with ts-node in --no-docker mode, which is very useful for development contributors
-   542080ed - Introducing in consistent response type from STH API endpoints, also implementation of type-layer error mechanism for StartSequence and DeleteSequence
-   a60bf30e - Added configurable instance adapter exit delay to sth config
-   9eb223dc - Improved error handling in api server
-   c37bed19 - Reduce size of Common Logs Pipe buffer
-   80c46760 - Improve Dockerfile for runner

New features:

-   **Topics** - You can now send data to STH without having to have a sequence
-   **Cloud Platform Connection** - Scramjet will allow to connect multiple STH to allow multipoint data sharing between them
-   **New Adapters** - New adapters added to instance and sequence which doesn't depend on Docker
-   **Log endpoint** - New endpoint '/logs' that streams all instances logs

Bugfixes:

-   Fix for spawning runner process
-   Container close issues now show not occur
-   Introduced fixes that close
-   Improved test stability
-   Improved Github Actions workflows
-   Fix for Service Discovery, where API endpoint '/input' is not blocking after the second PANG message.
-   Verify if package exists before sending it to STH
-   Fix for STH version unknown from response API endpoint '/version'
-   Add missing import in packages/types/sth-rest-api/src/index.ts.

## @scramjet/transform Hub - v0.13.2

This is the last release in changelog.
