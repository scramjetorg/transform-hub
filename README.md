<h1 align="center"><strong>Scramjet Platform</strong></h1>
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

# Scramjet Platform

Because distributed integrations should not require rebuilding networking and operations for every workflow, by combining runtime execution, APIs, RPC, and configured tunnels we created the Scramjet Platform.

Now you can deploy contained Python, Bun, and Node.js Sequences wherever work needs to happen; Transform Hubs run them locally, and Scramjet Manager coordinates connected Hubs over the internet using configured TLS encryption and client authentication.

## Start here

- [Manager operations](./docs/content/manager/overview.md)
- [STH runtime and package reference](./docs/readmes/packages/sth/README.md)
- [MultiManager reference](./docs/readmes/packages/multi-manager/README.md)
- [Sequence author guide](./docs/content/sequences/writing-sequences.md)
- [Sequence lifecycle](./docs/content/sequences/sequence-lifecycle.md)
- [Hub configuration and TLS trust](./docs/content/transform-hub/configuration.md)
- [Connecting Hubs](./docs/content/manager/connecting-hubs.md)

## Quick start

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

See [Hub setup and concepts](./docs/content/transform-hub/overview.md) for detailed setup and [build and run workflows](./docs/content/transform-hub/build-run.md) for local development.

## Documentation

Generated documentation is published to [docs/](./docs/), while handwritten source is maintained in [docs-source/](./docs-source/).

# Contributing

We accept valid contributions and we will be publishing a more specific project roadmap so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributors via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in `bdd` directory and include it in your pull request.

See [docs-source/development/contributing.md](./docs-source/development/contributing.md) for development instructions.

# License

The Scramjet Transform Hub project is dual-licensed under the AGPL-3.0 and MIT licenses. Parts of the project that are linked with your programs are MIT licensed, the rest is AGPL.
