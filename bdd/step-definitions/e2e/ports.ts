import { When } from "@cucumber/cucumber";
import * as net from "net";
//import { strict as assert } from "assert";
import { CustomWorld } from "../world";

When("get instance info", async function(this: CustomWorld) {
    this.resources.instanceInfo = (await this.resources.instance.getInfo()).data;
});

When("connect to instance", async function(this: CustomWorld) {
    const instanceInfo = this.resources.instanceInfo;

    console.log(instanceInfo);

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
});
