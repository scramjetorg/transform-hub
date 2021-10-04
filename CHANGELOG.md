# Scramjet Transform Hub Chanelog

This is the changelog for Scramjet Transform Hub. It holds only notable commits, others are grouped without commit info.

Prominent

* 6eef4229 - Every topic test scenario starts own host
* eb32427b - Remove unnecessary pipe on adding new topic
* f31916d7 - Fixes for stream ending with `x-stream-end` header.
* ceb4362d - Make `fetchOnlyIfExists` trully optional in docker image pulling procedure.
* 250d9f31 - Fix docker adapter to wait until image pull is finished.
* 547eeb8e - Allow to publish sequence ports, both TCP and UDP
* 48d59c69 - Temporary restoring wait before detaching endpoint
* 424bd67d - Colorize logger function name, update logs

New features:

* **Topics** - You can now send data to STH without having to have a sequence
* **Cloud Platform Connection** - Scramjet will allow to connect multiple STH to allow multipoint data sharing between them

Bugfixes:

* Container close issues now show not occur
* Introduced fixes that close
* Improved test stabulity
* Improved Github Actions workflows

## @scramjet/transform Hub - v0.12.1

This is the last release in changelog.
