import { When } from "@cucumber/cucumber";
import { InstanceClient, InstanceOutputStream } from "@scramjet/api-client";
import * as net from "net";
import { strict as assert } from "assert";
import { PassThrough, Stream } from "stream";
import * as crypto from "crypto";
import * as dgram from "dgram";

import { CustomWorld } from "../world";
import { URL } from "url";

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

    // console.log(this.resources.instanceInfo);
});

When("connect to instance on port {int}", { timeout: 20000 }, async function(this: CustomWorld, internalPort: number) {
    const instanceInfo = this.resources.instanceInfo;
    const port = instanceInfo.ports[internalPort + "/tcp"];

    console.log("Attempting to connect on port", port);

    this.resources.connection = await new Promise((resolve, reject) => {
        const connection = net.createConnection({
            port: instanceInfo.ports[internalPort + "/tcp"],
            host: process.env.SCRAMJET_HOST_URL ? new URL(process.env.SCRAMJET_HOST_URL).hostname : "localhost"
        })
            .once("connect", () => {
                resolve(connection);
            })
            .once("error", (e) => {
                reject(e);
            });
    });
});

When("connect to instance on port {int} udp server", { timeout: 20000 }, async function(this: CustomWorld, internalPort: number) {
    const instanceInfo = this.resources.instanceInfo;
    const port = instanceInfo.ports[internalPort + "/udp"];
    const host = process.env.SCRAMJET_HOST_URL ? new URL(process.env.SCRAMJET_HOST_URL).hostname : "localhost";

    console.log("Attempting to connect on port: ", port, "host: ", host);

    this.resources.client = dgram.createSocket("udp4")
        .on("error", (err) => {
            console.log(`server error:\n${err.stack}`);
        });
});

When("send data to instance tcp server", async function(this: CustomWorld) {
    this.resources.testMessage = crypto.randomBytes(128).toString("hex");

    const client = this.resources.client as dgram.Socket;
    //connection.write(this.resources.testMessage);
    const message = Buffer.from("Some bytes");

    client.send(message, 0, message.length, 41234, "localhost", (err) => {
        this.resources.connection.close();
    });
    client.on("message", (msg, rinfo) => {
        console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    });
});

When("start reading {string} stream", async function(this: CustomWorld, log: InstanceOutputStream) {
    const instance: InstanceClient = this.resources.instance;
    const stream = (await instance.getStream(log)).data;

    this.resources.stream = new PassThrough();
    stream?.pipe(this.resources.stream);
});

When("check stream for message sent", async function(this: CustomWorld) {
    this.resources.stream.end();
    const str = await streamToString(this.resources.stream);

    assert.notEqual(
        str.includes(this.resources.testMessage), null
    );
});

When("send {string} to {string} server", async function(this: CustomWorld, str: string, serverType: string) {
    if (serverType === "tcp") {
        this.resources.connection.write(str);
    }

    if (serverType === "udp") {
        const client = this.resources.client as dgram.Socket;

        client.send(str, 0, str.length, 41234, "localhost", (err) => {
            client.close();
        });
    }
});
