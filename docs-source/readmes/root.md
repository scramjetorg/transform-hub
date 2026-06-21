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

<!-- PACKAGE-LIST -->

# Documentation

Generated documentation is published to [dist-docs/](./dist-docs/), including content pages, curated TypeScript reference, README mirrors, and metadata for Docusaurus consumption.

Handwritten documentation source lives in [docs-source/](./docs-source/). See [docs-source/README.md](./docs-source/README.md) for authoring conventions.

# Contributing

We accept valid contributions and we will be publishing a more specific project roadmap so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributors via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in `bdd` directory and include it in your pull request.

See [docs-source/development/contributing.md](./docs-source/development/contributing.md) for development instructions.

# License

The Scramjet Transform Hub project is dual-licensed under the AGPL-3.0 and MIT licenses. Parts of the project that are linked with your programs are MIT licensed, the rest is AGPL.
