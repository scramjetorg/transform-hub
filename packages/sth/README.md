<h1 align="center"><strong>Scramjet Transform Hub</strong></h1>

<p align="center">
    <a href="https://github.com/scramjetorg/transform-hub/blob/HEAD/LICENSE"><img src="https://img.shields.io/github/license/scramjetorg/transform-hub?color=green&style=plastic" alt="GitHub license" /></a>
    <a href="https://npmjs.org/package/@scramjet/sth"><img src="https://img.shields.io/github/v/tag/scramjetorg/transform-hub?label=version&color=blue&style=plastic" alt="STH version" /></a>
    <a href="https://github.com/scramjetorg/transform-hub"><img src="https://img.shields.io/github/stars/scramjetorg/transform-hub?color=pink&style=plastic" alt="GitHub stars" /></a>
    <a href="https://npmjs.org/package/@scramjet/sth"><img src="https://img.shields.io/npm/dt/@scramjet/sth?color=orange&style=plastic" alt="npm" /></a>
    <a href="https://discord.gg/TTqCpHDjHz"><img alt="Discord" src="https://img.shields.io/discord/925384545342201896?label=discord&style=plastic"></a>
    <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW">
        <img src="https://img.shields.io/badge/Donate-PayPal-green.svg?color=yellow&style=plastic" alt="Donate" />
    </a>
</p>
<p align="center">⭐ Star us on GitHub — it motivates us a lot! 🚀 </p>
<p align="center">
    <img src="https://assets.scramjet.org/sth-logo.svg" alt="Scramjet Transform Hub Logo">
</p>


Scramjet Transform Hub is a deployment and execution platform. Once installed on a server, it will allow you to start your programs and keep them running on a remote machine. You will be able to start programs in the background or connect to them and see their output directly on your terminal. You will be able to pipe your local data to the program as if it was running from your terminal. You can start your server in AWS, Google Cloud or Azure, start it on your local machine, install it on a Raspberry Pi or wherever else you'd like.

## TL;DR

Install and start the hub, copy the following commands to the terminal:

```bash
npm i -g @scramjet/sth @scramjet/cli
scramjet-transform-hub
```

Depending on your machine this may take some time. When it's done the Hub should be running and you should see initial logs showing that the API server has been started on port 8000, something like this:

```shell
2021-07-07T18:19:36.808Z info (object:Host) API listening on port: localhost:8000
```

Now create an application, let's say you want to get the currency rates every 10 seconds and do something. In a clean folder save this as `index.js`:

```js
const { DataStream } = require("scramjet");
const fetch = require("node-fetch");

module.exports = function(_stream, apikey, fr, to) {
    const idx = `${fr}_${to}`;
    const get = () => fetch(`https://free.currconv.com/api/v7/convert?q=${idx}&compact=ultra&apiKey=${apikey}`).then(r => r.json());
    const defer = (t = 10000) => new Promise((res) => setTimeout(res, t));

    return DataStream
        .from(async function*() {
            while (true)
                yield await Promise.all([get(), defer()]).then(([data]) => data);
        })
        .do(async x => { console.log(x[idx]); }) // add some logic here
        .run();
};
```

Copy a content below and save it as `package.json` file:

```json
{
  "name": "@scramjet/currency-js",
  "version": "0.12.2",
  "main": "index.js",
  "author": "Scramjet <open-source@scramjet.org>",
  "license": "GPL-3.0",
  "dependencies": {
    "node-fetch": "^2.6.1",
    "scramjet": "^4.36.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/scramjetorg/transform-hub.git"
  }
}
```

Open a terminal run your program on the hub:

```bash
si pack /path/to/my/folder -o ~/package.tar.gz # compress the app to a package
SEQ_ID=$(si seq send ~/package.tar.gz)         # upload the package to the server SEQ_ID is now it's id
INT_ID=$(si seq start $SEQ_ID -C "{}" $APIKEY BTC EUR)
                                               # start the program on the host with arguments
si inst stdout $INT_ID                         # see the output from the program.
```

See `si help` for more information. Also you will need to get an [API key for this example](https://free.currencyconverterapi.com/).

## The basics

Scramjet Transform Hub allows you to deploy and execute programs that you build and develop. As mentioned above, you can run any program you like, but you need to know a couple of important things:

* The program should consist of a function or an array of functions, such a program is called a **Transform Sequence**.
* The sequence will be executed within a separate docker instance (we're working on other execution environment integrations - help will be appreciated).
* The sequence function will receive a stream as input in the first argument - you can send the data to it via the command `si instance input`.
* If your sequence contains more than one function, then the output from the previous one is passed to the next one. The first function in sequence receives the input from API.
* The last (or the only) function in sequence can return a `Promise` or a `Stream` - based on this, STH will know when processing is done.
* Once the returned `Promise` is resolved, or the `Stream` is ended, STH will gracefully stop the sequence and remove its container.
* You can communicate with the server via API, command line client `si` which we wrote for your convenience.
* The sequence is called with an AppContext as `this`, a class that allows you to communicate back from the sequence: send logs, provide health info, send and receive events from the API or CLI.
* You can run your sequence multiple times with different arguments (like for instance currency tickers with different symbols or sensor data readers for each sensor)
* The program does not leave your server and doesn't use any external systems. It runs on the server you install the host on.
* Currently STH supports node.js runner only, we're working on bringing you runners for other languages, with Python and C++ as the first ones.

## Use cases

There's no limit what you can use it for. You want a stock checker? A chat bot? Maybe you'd like to automate your home? Retrieve sensor data? Maybe you have a lot of data and want to transfer and wrangle it? You have a database of cities and you'd like to enrich your data? You do machine learning and you want to train your set while the data is fetched in real time? Hey, you want to use it for something else and ask us if that's a good use? Ask us [via email](mailto:get@scramjet.org) or hop on our [Scramjet Discord](https://discord.gg/4EX3jHBe)!

## Some important links

* Scramjet, the company behind [Transform Hub](https://scramjet.org)
* The [Scramjet Framework - functional reactive stream processing framework](https://framework.scramjet.org)
* The [Transform Hub repo on github](https://github.com/scramjetorg/transform-hub)
* You can see the [Scramjet Transform Hub API docs here](https://github.com/scramjetorg/transform-hub/tree/HEAD/docs/api-client/README.md)
* You can see the [CLI documentation here](https://github.com/scramjetorg/transform-hub/tree/HEAD/packages/cli/README.md), but `si help` should also be quite effective.
* Don't forget to ⭐ this repo if you like it, `subscribe` to releases and keep visiting us for new versions and updates.
* You can [open an issue - file a bug report or a feature request here](https://github.com/scramjetorg/transform-hub/issues/new/choose)

## Contributions

We accept valid contributions and we will be publishing a more specific project roadmap so contributors can propose features and also help us implement them. We kindly ask you that contributed commits are Signed-Off `git commit --sign-off`.

We provide support for contributors via test cases. If you expect a certain type of workflow to be officially supported, please specify and implement a test case in `Gherkin` format in `bdd` directory and include it in your pull request. More info about our BDD test you will find [here](https://github.com/scramjetorg/transform-hub/tree/HEAD/bdd/README.md).

### Help wanted 👩‍🎓🧑‍🦰👱‍♀️

The project need's your help! There's lots of work to do and we have a lot of plans. If you want to help and be part of the Scramjet team, please reach out to us, [on discord](https://discord.gg/4EX3jHBe) or email us: [opensource@scramjet.org](mailto:opensource@scramjet.org).

### Donation 💸

Do you like this project? It helped you to reduce time spent on delivering your solution? You are welcome to buy us a coffee ☕ Thanks a lot! 😉

[You can sponsor us on github](https://github.com/sponsors/scramjetorg)

* There's also a Paypal donation link if you prefer that:

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW)



