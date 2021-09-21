/* eslint-disable no-console */
import { When } from "@cucumber/cucumber";
import { InstanceOutputStream } from "@scramjet/api-client";
import * as net from "net";
import { strict as assert } from "assert";
import { PassThrough, Stream } from "stream";
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
    this.resources.instanceInfo = (await this.resources.instance!.getInfo()).data;

    console.log(this.resources.instanceInfo);
});

When("connect to instance on port {int} using {string} server", { timeout: 20000 }, async function(this: CustomWorld, internalPort: number, givenServer: string) {
    const instanceInfo = this.resources.instanceInfo;
    const host = process.env.SCRAMJET_HOST_URL ? new URL(process.env.SCRAMJET_HOST_URL).hostname : "localhost";

    if (givenServer === "tcp") {
        const port = instanceInfo.ports[internalPort + "/tcp"];

        console.log(`Attempting to connect on ${givenServer} port:${port}, host: ${host}`);

        this.resources.connection = await new Promise((resolve, reject) => {
            const connection = net.createConnection({
                port: instanceInfo.ports[internalPort + "/tcp"],
                host: host
            })
                .once("connect", () => {
                    resolve(connection);
                })
                .once("error", (e) => {
                    reject(e);
                });
        });
    } else if (givenServer === "udp") {
        this.resources.internalPort = internalPort;
        const port = instanceInfo.ports[internalPort + "/udp"];

        console.log(`Attempting to connect on ${givenServer} port:${port}, host: ${host}`);

        this.resources.client = dgram.createSocket("udp4")
            .on("error", (err) => {
                console.log(`server error:\n${err.stack}`);
            });
    } else {
        console.log(`Sequence argument not recognized: ${givenServer}`);
    }
});

When("send {string} to {string} server", async function(this: CustomWorld, str: string, serverType: string) {
    if (serverType === "tcp") {
        this.resources.connection.write(str);
    }

    if (serverType === "udp") {
        const client = this.resources.client as dgram.Socket;
        const instanceInfo = this.resources.instanceInfo;
        const port = instanceInfo.ports[this.resources.internalPort + "/udp"];
        const host = process.env.SCRAMJET_HOST_URL ? new URL(process.env.SCRAMJET_HOST_URL).hostname : "localhost";

        client.send(str, 0, str.length, port, host, (err) => {
            console.log(err?.stack);
            client.close();
        });
    }
});

When("start reading {string} stream", async function(this: CustomWorld, log: InstanceOutputStream) {
    const stream = (await this.resources.instance!.getStream(log)).data;

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
