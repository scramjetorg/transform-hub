import { When } from "@cucumber/cucumber";
import { InstanceClient, InstanceOutputStream } from "@scramjet/api-client";
import * as net from "net";
import { strict as assert } from "assert";
import { PassThrough, Stream } from "stream";
import * as crypto from "crypto";

import { CustomWorld } from "../world";

const streamToString = async (stream: Stream): Promise<string> => {
    const chunks = [];
    const strings = stream.pipe(new PassThrough({ encoding: "utf-8" }));

    for await (const chunk of strings) {
        chunks.push(chunk);
    }

    return chunks.join("");
};

When("get instance info", async function(this: CustomWorld) {
    this.resources.instanceInfo = (await this.resources.instance.getInfo()).data;

    console.log(this.resources.instanceInfo);
});

When("connect to instance on port {int}", { timeout: 20000 }, async function(this: CustomWorld, internalPort: number) {
    const instanceInfo = this.resources.instanceInfo;

    this.resources.connection = await new Promise((resolve, reject) => {
        const connection = net.createConnection({ port: instanceInfo.ports[internalPort + "/tcp"] })
            .once("connect", () => {
                resolve(connection);
            })
            .once("error", () => {
                reject();
            });
    });
});


When("send data to instance tcp server", async function(this: CustomWorld) {
    this.resources.testMessage = crypto.randomBytes(128).toString("hex");
    this.resources.connection.write(this.resources.testMessage);
});

When("start reading {string} stream", async function(this: CustomWorld, log: InstanceOutputStream) {
    const instance: InstanceClient = this.resources.instance;
    const stream = (await instance.getStream(log)).data;

    this.resources.stream = new PassThrough();
    stream.pipe(this.resources.stream);
});

When("check stream for message sent", async function(this: CustomWorld) {
    this.resources.stream.end();
    const str = await streamToString(this.resources.stream);

    assert.notEqual(
        str.includes(this.resources.testMessage), null
    );
});

When("send {string} to tcp server", async function(this: CustomWorld, str) {
    this.resources.connection.write(str);
});
