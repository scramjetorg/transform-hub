<h1 align="center"><strong>Scramjet Transform Hub</strong></h1>
<p align="center">
    <a href="https://github.com/scramjetorg/transform-hub/blob/HEAD/LICENSE"><img src="https://img.shields.io/github/license/scramjetorg/transform-hub?color=green&style=plastic" alt="GitHub license" /></a>
    <a href="https://npmjs.org/package/@scramjet/sth"><img src="https://img.shields.io/github/v/tag/scramjetorg/transform-hub?label=version&color=blue&style=plastic" alt="STH version" /></a>
    <a href="https://github.com/scramjetorg/transform-hub"><img src="https://img.shields.io/github/stars/scramjetorg/transform-hub?color=pink&style=plastic" alt="GitHub stars" /></a>
    <a href="https://npmjs.org/package/@scramjet/sth"><img src="https://img.shields.io/npm/dt/@scramjet/sth?color=orange&style=plastic" alt="npm" /></a>
    <a href="https://scr.je/join-community-mg1"><img alt="Discord" src="https://img.shields.io/discord/925384545342201896?label=discord&style=plastic"></a>
    <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW">
        <img src="https://img.shields.io/badge/Donate-PayPal-green.svg?color=yellow&style=plastic" alt="Donate" />
    </a>
</p>
<p align="center">⭐ Star us on GitHub — it motivates us a lot! 🚀 </p>
<p align="center">
    <img src="https://assets.scramjet.org/sth-logo.svg" alt="Scramjet Transform Hub Logo">
</p>

# The Idea

Scramjet Transform Hub is an open-source runtime supervisor for packaging, deploying, running, and monitoring stream-oriented programs called Transform Sequences.

The Hub is the heart of Scramjet Cloud Platform, a serverless data processing system that allows you to easily deploy, run and interconnect programs that process repetitive data tasks in long-running processes. STH can be run just as well on a Raspberry Pi as it can on a massive 128 core Epyc bare metal server. It installs in one simple command and deploys your app to processes, Docker containers or Kubernetes clusters just as easily.

It currently supports **Node.js**, **Bun**, and **Python** based sequences.

[Get Scramjet Transform Hub straight from NPM](https://www.npmjs.com/package/@scramjet/sth)

If you don't have a server ready or want to run something from the cloud itself, do check out our website and try the hosted version of [Scramjet Cloud Platform](https://scramjet.org/).

---

# Quick Start

Install the Hub and CLI packages:

```bash
npm install -g @scramjet/sth @scramjet/cli
```

Start the Hub (default: adapter detection on port 8000):

```bash
scramjet-transform-hub
```

Package and deploy a sequence from another terminal:

```bash
si sequence pack /path/to/sequence -o sequence.tar.gz
si sequence deploy sequence.tar.gz
```

Requirements:
- **Node.js >= 18** for the Hub and Node sequences
- **Bun >= 1.0** for Bun sequences
- **Python >= 3.9** for Python sequences
- **Docker** for Docker adapter deployments

See [docs-source/transform-hub/overview.md](./docs-source/transform-hub/overview.md) for detailed setup and [docs-source/transform-hub/build-run.md](./docs-source/transform-hub/build-run.md) for build and run workflows.

---

# Packages

The monorepo contains the following npm packages:

| Package | Description |
|---------|-------------|
| [@scramjet/adapter-docker](./packages/adapter-docker/) | This module holds the docker adapters utilized by Scramjet Transform Hub |
| [@scramjet/adapter-kubernetes](./packages/adapter-kubernetes/) | Kubernetes adapter for sequence storage, runner pod execution, CLI/config augmentation, and client initialization. |
| [@scramjet/adapter-process](./packages/adapter-process/) | This module holds the process adapters utilized by Scramjet Transform Hub |
| [@scramjet/adapters](./packages/adapters/) | Legacy adapter re-export barrel; prefer individual adapter packages (adapter-docker, adapter-kubernetes, adapter-process) for new usage. |
| [@scramjet/adapters-common](./packages/adapters-common/) | This module holds the common items held by adapters utilized by Scramjet Transform Hub |
| [@scramjet/api-client](./packages/api-client/) | The package provides the API Client for use with Scramjet Transform Hub. |
| [@scramjet/api-router](./packages/api-router/) | Schema-aware API route declaration, manifest, and client contract package for Scramjet Transform Hub. |
| [@scramjet/api-server](./packages/api-server/) | HTTP API server for router construction, server setup, REST/stream handlers, middleware, and routed forwarding. |
| [@scramjet/bpmux](./packages/bpmux/) | Node stream multiplexing with back-pressure on each stream |
| [@scramjet/cli](./packages/cli/) | The package provides a CLI interface to communicate with Scramjet Transform Hub. |
| [@scramjet/client-utils](./packages/client-utils/) | The package provides the API Client Utils for use with Scramjet Transform Hub. |
| [@scramjet/config](./packages/config/) | The package provides Zod-backed configuration loading, validation, masking, and CLI option metadata. |
| [@scramjet/frame-stream](./packages/frame-stream/) | Length-prefixed message framing for Node.js streams. |
| [@scramjet/host](./packages/host/) | The package provides the main host subsystem of STH - starts API Servers, creates adapters etc. |
| [@scramjet/load-check](./packages/load-check/) | The package provides health info for STH. |
| [@scramjet/logger](./packages/logger/) | The package provides a simple logger with 100% Console Web API compatible signatures and a streaming output of any choice. |
| [@scramjet/manager](./packages/manager/) | Scramjet Manager |
| [@scramjet/manager-config](./packages/manager-config/) | Scramjet CPM Config |
| [@scramjet/middleware-api-client](./packages/middleware-api-client/) | Scramjet Middleware API Client |
| [@scramjet/model](./packages/model/) | The package provides the domain model for STH and the CLI. |
| [@scramjet/module-loader](./packages/module-loader/) | Scramjet Module Loader |
| [@scramjet/monitoring-server](./packages/monitoring-server/) | Scramjet Monitoring Server |
| [@scramjet/multi-manager](./packages/multi-manager/) | This package is part of Scramjet Cloud Platform. |
| [@scramjet/multi-manager-api-client](./packages/multi-manager-api-client/) | Scramjet MultiManager API Client |
| [@scramjet/obj-logger](./packages/obj-logger/) | Object-mode structured logger with pipeable stream output, log level control, multi-target support, and source aggregation. |
| [@scramjet/pre-runner](./packages/pre-runner/) | The package identifies the sequences and returns the information to back STH. |
| [@scramjet/rest-api2](./packages/rest-api2/) | Scramjet Transform Hub v2 REST API contracts and common client. |
| [@scramjet/runner](./packages/runner/) | The package executes the remote runners and provides communication with them through abstraction layer provided by adapters. |
| [@scramjet/runner-bun](./packages/runner-bun/) | Bun sequence runtime wrapper for Scramjet Transform Hub runner isolation. |
| [@scramjet/runner-node](./packages/runner-node/) | Node sequence runtime for Scramjet Transform Hub runner isolation. |
| [@scramjet/runner-python](./packages/runner-python/) | Python runtime wrapper for packages/runner |
| [@scramjet/sequence-test](./packages/sequence-test/) | Test harness for Scramjet Transform Sequences using the runner protocol without starting a full Transform Hub. |
| [@scramjet/sth](./packages/sth/) | Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Raspberry Pi or wherever else you'd like. |
| [@scramjet/sth-config](./packages/sth-config/) | STH configuration defaults, image defaults, deep-merge updates, runtime-adapter selection, and public-safe config extraction. |
| [@scramjet/symbols](./packages/symbols/) | The package holds the symbols and enumerations for STH. |
| [@scramjet/telemetry](./packages/telemetry/) | The package provides modules for gathering analytics data. |
| [@scramjet/types](./packages/types/) | The package holds the typescript definitions for all common STH interfaces. |
| [@scramjet/utility](./packages/utility/) | The package holds utility functions used in places around Scramjet Transform Hub. |
| [@scramjet/verser](./packages/verser/) | The package provides a reverse server functionality used among Scramjet modules. |


# Documentation

Generated documentation is published to [dist-docs/](./dist-docs/), including content pages, curated TypeScript reference, README mirrors, and metadata for Docusaurus consumption.

Handwritten documentation source lives in [docs-source/](./docs-source/). See [docs-source/README.md](./docs-source/README.md) for authoring conventions.

# Contributing

We accept valid contributions and we will be publishing a more specific project roadmap so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributors via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in `bdd` directory and include it in your pull request.

See [docs-source/development/contributing.md](./docs-source/development/contributing.md) for development instructions.

# License

The Scramjet Transform Hub project is dual-licensed under the AGPL-3.0 and MIT licenses. Parts of the project that are linked with your programs are MIT licensed, the rest is AGPL.

---

<!-- Generated by scripts/docs.js from docs-source/readmes/root.md. Do not edit this file directly. -->
