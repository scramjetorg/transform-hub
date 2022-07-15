<h1 align="center"><strong>Scramjet Transform Hub Middleware API Client</strong></h1>

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

The package provides an Middleware API Client for use with Scramjet Platform. Allows access to platform resources using access token and helps with HostClient, SequenceClient and InstanceClient creation.

Usage:

```js
import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { ClientUtils } from "@scramjet/client-utils";

let middlewareClient = new MiddlewareClient(middlewareUrl);

ClientUtils.setDefaultHeaders({
    Authorization: `Bearer ${token}`,
});
```

## Docs

See the code documentation here: [scramjetorg/transform-hub/docs/middleware-api-client/modules.md](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/middleware-api-client/modules.md)

## More reading

In the link below you will find more information about our stream protocol and API usage.

See the code documentation here: [scramjetorg/transform-hub/docs/read-more/stream-and-api.md](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/read-more/stream-and-api.md)

## Scramjet Transform Hub

This package is part of [Scramjet Transform Hub](https://www.npmjs.org/package/@scramjet/sth).

Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program, as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Raspberry Pi or wherever else you'd like.

## Use cases

There's no limit what you can use it for. You want a stock checker? A chat bot? Maybe you'd like to automate your home? Retrieve sensor data? Maybe you have a lot of data and want to transfer and wrangle it? You have a database of cities and you'd like to enrich your data? You do machine learning and you want to train your set while the data is fetched in real time? Hey, you want to use it for something else and ask us if that's a good use? Ask us [via email](mailto:get@scramjet.org) or hop on our [Scramjet Discord](https://scr.je/join-community-mg1)!

## Quick guide

-   [Host operations](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/api-client/#host-operations)
-   [Sequence operations](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/api-client/#sequence-operations)
-   [Instance basic operations](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/api-client/#instance-basic-operations)
-   [Instance advanced operation](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/api-client/#instance-advanced-operation)
-   [Service Discovery: Topics](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/api-client/#service-discovery-topics)

---

## Some important links

-   Scramjet, the company behind [Transform Hub](https://scramjet.org)
-   The [Scramjet Framework - functional reactive stream processing framework](https://framework.scramjet.org)
-   The [Transform Hub repo on github](https://github.com/scramjetorg/transform-hub)
-   You can see the [Scramjet Transform Hub API docs here](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/api-client/README.md)
-   You can see the [CLI documentation here](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/README.md), but `si help` should also be quite effective.
-   Don't forget to ⭐ this repo if you like it, `subscribe` to releases and keep visiting us for new versions and updates.
-   You can [open an issue - file a bug report or a feature request here](https://github.com/scramjetorg/transform-hub/issues/new/choose)

## License and contributions

This module is licensed under AGPL-3.0 license.

The Scramjet Transform Hub project is dual-licensed under the AGPL-3.0 and MIT licenses. Parts of the project that are linked with your programs are MIT licensed, the rest is AGPL.

## Contributions

We accept valid contributions and we will be publishing a more specific project roadmap so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributors via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in `bdd` directory and include it in your pull request. More info about our BDD test you will find [here](https://github.com/scramjetorg/transform-hub/tree/HEAD/bdd/README.md).

### Help wanted 👩‍🎓🧑👱‍♀️

The project need's your help! There's lots of work to do and we have a lot of plans. If you want to help and be part of the Scramjet team, please reach out to us, [on discord](https://scr.je/join-community-mg1) or email us: [opensource@scramjet.org](mailto:opensource@scramjet.org).

### Donation 💸

Do you like this project? It helped you to reduce time spent on delivering your solution? You are welcome to buy us a coffee ☕ Thanks a lot! 😉

[You can sponsor us on github](https://github.com/sponsors/scramjetorg)

-   There's also a Paypal donation link if you prefer that:

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW)
