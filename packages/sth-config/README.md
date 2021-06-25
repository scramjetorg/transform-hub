# `@scramjet/image-config.json`

```json
{
    "prerunner": "repo.int.scp.ovh/scramjet/pre-runner:0.10.0-pre.1",
    "runner": "repo.int.scp.ovh/scramjet/runner:0.10.0-pre.1"
}
```

## Description

This configuration JSON file is necessary to identify the corresponding image that needs to be used to unpack the Sequence and run it in the container. Thanks to this config file Supervisor will have knowledge about the reference images for Runner and Prerunner.

Currently the file contains only two images named:

`"prerunner"`
and
`"runner"`

 and their addresses:

`"repo.int.scp.ovh/scramjet/pre-runner:0.10.0-pre.1"`
`"repo.int.scp.ovh/scramjet/runner:0.10.0-pre.1"`

located in Scramjet Registry <https://repo.int.scp.ovh>

The list of the images will grow together with the number of programming languages that Scramjet Platform will support. e.g.: the Sequence written in C++ will be run in a container that was created from a different image than the one written in JavaScript.

MultiHost starts and loads the file `image-config.json`. Then, the request comes to unpack and save the Sequence, it reads the "prerunner" value and reveal the name of the docker container image that should be used to run the prerunner container (i.e. the one that unpacks and reads the contents of package.json). When starting the Instance, the "runner" value is read and from its address the image for the container in which the Instance will be run is downloaded.

## Usage

[comment]: < I am not sure if the usage below is OK, please correct if not, thank you form the mountain! ;) >

```js
import { imageConfig } from "@scramjet/sth-config";

async init() {
    this.imageConfig = await imageConfig();
}
```
