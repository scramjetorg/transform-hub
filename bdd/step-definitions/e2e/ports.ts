import { When } from "@cucumber/cucumber";
import { InstanceClient, InstanceOutputStream } from "@scramjet/api-client";
import * as net from "net";

import { CustomWorld } from "../world";

When("get instance info", async function(this: CustomWorld) {
    this.resources.instanceInfo = (await this.resources.instance.getInfo()).data;
});

When("connect to instance", { timeout: 20000 }, async function(this: CustomWorld) {

    const instanceInfo = this.resources.instanceInfo;

    this.resources.connection = await new Promise((resolve, reject) => {
        const connection = net.createConnection({ port: instanceInfo.ports["7006/tcp"] });

        connection.once("connect", () => {
            resolve(connection);
        });

        connection.once("error", () => {
            reject();
        });
    });
});


When("send data to instance tcp server", async function(this: CustomWorld) {
    this.resources.connection.write("Take this!");
    this.resources.connection.end();
});

When("get {string} stream", async function(this: CustomWorld, log: InstanceOutputStream) {
    const instance: InstanceClient = this.resources.instance;

    console.log("Getting log");
    const stream = (await instance.getStream(log)).data;

    stream.pipe(process.stdout);
});
