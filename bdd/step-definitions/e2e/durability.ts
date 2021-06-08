import { ApiClient, HostClient } from "@scramjet/api-client";
import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";

import * as crypto from "crypto";
import * as fs from "fs";
import { InstanceClient } from "@scramjet/api-client/src/instance-client";

const apiClient = new ApiClient();
const hostClient = new HostClient("http://localhost:8000/api/v1");
const instances: InstanceClient[] = [];

// eslint-disable-next-line complexity
When("starts at least {int} sequences {string} for {float} hours", { timeout: 3600 * 48 * 1000 }, async (minNumber: number, seq: string, hrs: number) => {
    // eslint-disable-next-line no-extra-parens
    const sequenceClient = await hostClient.sendSequence(fs.readFileSync(seq));
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

    let accepted = false;
    let full = false;

    do {
        // eslint-disable-next-line no-loop-func
        await new Promise(res => { setTimeout(res, 5000); });
        accepted = false;

        const loadCheck = await apiClient.getHostLoadCheck();

        // eslint-disable-next-line no-extra-parens
        if ((loadCheck as any).status !== 200 || loadCheck.data.memFree < (512 << 20)) {
            full = true;
        } else {
            const instance = await sequenceClient.start(data.appConfig, data.args);

            if (instance) {
                instances.push(instance);
                accepted = true;
            } else {
                full = true;
            }
        }

        if (full) {
            console.log("Host is full. Total sequences started: ", instances.length);
        }

        if (instances.length > minNumber) {
            break;
        }

    } while (accepted && !full);

    if (instances.length < minNumber) {
        assert.fail();
    }

    console.log("Last instance started on:", new Date().toUTCString());
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
                    reject();
                }
            }) as Promise<void>
        )),
        "Some instances are unresponsible."
    );

    await Promise.all(instances.map(instance =>
        instance.stop(0, false)
    ));
});
