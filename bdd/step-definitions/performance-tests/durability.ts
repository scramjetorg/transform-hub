/* eslint-disable no-console */
import { HostClient, InstanceClient } from "@scramjet/api-client";
import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";

import * as crypto from "crypto";

import { createReadStream } from "fs";
import { CustomWorld } from "../world";
import { defer } from "../../lib/utils";

const hostClient = new HostClient("http://localhost:8000/api/v1");
const assetsLocation = process.env.SCRAMJET_ASSETS_LOCATION || "https://assets.scramjet.org/";

// eslint-disable-next-line complexity
When("starts at least {int} sequences from file {string}", { timeout: 3600 * 48 * 1000 }, async function(this: CustomWorld, minNumber: number, seq: string) {
    // eslint-disable-next-line no-extra-parens
    const sequence = await hostClient.sendSequence(createReadStream(seq));
    const data = {
        appConfig: {},
        args: [
            400,
            [
                `${assetsLocation}scp-store/durability-test/file1.bin`,
                `${assetsLocation}scp-store/durability-test/file2.bin`,
                `${assetsLocation}scp-store/durability-test/file3.bin`
            ]
        ]
    };

    let rejected = false;

    this.resources.instances = [];

    do {
        await defer(1000);

        const loadCheck = await hostClient.getLoadCheck();

        // eslint-disable-next-line no-extra-parens
        if ((loadCheck as any).status !== 200 || loadCheck.data?.memFree < (512 << 20)) {
            rejected = true;
        } else {
            const instance = await sequence.start(data.appConfig, data.args);

            if (instance) {
                this.resources.instances.push(instance);
                (await instance.getStream("log")).data?.pipe(process.stdout);
                rejected = false;
            } else {
                rejected = true;
            }
        }

        if (rejected) {
            console.log("Sequence rejected. Total sequences started: ", this.resources.instances.length);
        }

        if (this.resources.instances.length > minNumber) {
            console.log("Total sequences started: ", this.resources.instances.length);
            break;
        }
    } while (!rejected);

    if (this.resources.instances.length < minNumber) {
        assert.fail("Can't start enough instances.");
    }

    console.log("Last instance started on:", new Date().toUTCString());
});

Then("stop all instances", { timeout: 60 * 1000 }, async function(this: CustomWorld) {
    await Promise.all(this.resources.instances.map((instance: InstanceClient) =>
        instance.stop(0, false)
    ));
});

Then("check every {float} seconds if instances respond for {float} hours", { timeout: 3600 * 48 * 1000 }, async function(this: CustomWorld, seconds: number, timeoutHrs: number) {
    let rej: Function;

    const timePassedPromise = new Promise<boolean>((resolve, reject) => {
        rej = reject;
        setTimeout(() => {
            clearInterval(this.resources.interval);
            resolve(true);
        }, timeoutHrs * 3600 * 1000);
    });

    this.resources.interval = setInterval(async () => {
        console.log("Start sending events...");

        await Promise.all(this.resources.instances.map(async (instance: InstanceClient) => {
            const hash = `${instance.id} ${crypto.randomBytes(20).toString("hex")}`;

            await instance.sendEvent("check", hash);
            await defer(5000);

            try {
                const response = await instance.getEvent("check");

                if (response.data?.message.asked === hash) {
                    return;
                }
                console.error(`${instance.id}, sent: ${hash}, received: ${JSON.stringify(response.data)}`);
                rej(JSON.stringify({ id: instance.id, sent: hash, data: response.data, message: "not match" }));
            } catch (err: any) {
                console.error(err, instance.id);
                throw new Error("event data not equal to the data sent");
            }
        }
        ));
    }, seconds * 1000);

    assert.ok(await timePassedPromise);
});

