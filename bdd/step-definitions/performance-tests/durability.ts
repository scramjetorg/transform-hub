import { HostClient } from "@scramjet/api-client";
import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";

import * as crypto from "crypto";
import { InstanceClient } from "@scramjet/api-client/src/instance-client";
import { createReadStream } from "fs";

const hostClient = new HostClient("http://localhost:8000/api/v1");
const instances: InstanceClient[] = [];

// eslint-disable-next-line complexity
When("starts at least {int} sequences from file {string} for {float} hours", { timeout: 3600 * 48 * 1000 }, async (minNumber: number, seq: string, hrs: number) => {
    // eslint-disable-next-line no-extra-parens
    const sequence = await hostClient.sendSequence(createReadStream(seq));
    const data = {
        appConfig: {},
        args: [
            hrs * 3600,
            400,
            [
                "https://repo.int.scp.ovh/repository/scp-store/durability-test/file1.bin",
                "https://repo.int.scp.ovh/repository/scp-store/durability-test/file2.bin",
                "https://repo.int.scp.ovh/repository/scp-store/durability-test/file3.bin"
            ]
        ]
    };

    let rejected = false;

    do {
        // eslint-disable-next-line no-loop-func
        await new Promise(res => { setTimeout(res, 1000); });
        rejected = false;

        const loadCheck = await hostClient.getLoadCheck();

        // eslint-disable-next-line no-extra-parens
        if ((loadCheck as any).status !== 200 || loadCheck.data.memFree < (512 << 20)) {
            rejected = true;
        } else {
            const instance = await sequence.start(data.appConfig, data.args);

            if (instance) {
                instances.push(instance);
                rejected = false;
            } else {
                rejected = true;
            }
        }

        if (rejected) {
            console.log("Sequence rejected. Total sequences started: ", instances.length);
        }

        if (instances.length > minNumber) {
            console.log("Total sequences started: ", instances.length);
            break;
        }

    } while (!rejected);

    if (instances.length < minNumber) {
        assert.fail("Can't start enough instances.");
    }

    console.log("Last instance started on:", new Date().toUTCString());
});

When("wait for {float} hours", { timeout: 3600 * 48 * 1000 }, async (timeoutHrs: number) => {
    await new Promise(res => setTimeout(res, timeoutHrs * 3600 * 1000));
});

Then("check if instances respond", { timeout: 60000 }, async () => {
    assert.ok(
        await Promise.all(instances.map((instance: InstanceClient) =>
            new Promise(async (resolve, reject) => {
                const hash = crypto.randomBytes(20).toString("hex");

                await instance.sendEvent("check", hash);
                await new Promise(res => setTimeout(res, 2000));

                try {
                    const response = await instance.getEvent();

                    if (response.data.message.asked === hash) {
                        resolve();
                    }
                } catch (err) {
                    reject("event data not equal to the data sent");
                }
            }) as Promise<void>
        )),
        "Some instances are unresponsible."
    );

    await Promise.all(instances.map(instance =>
        instance.stop(0, false)
    ));
});
