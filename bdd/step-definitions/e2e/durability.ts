import { ApiClient, HostClient } from "@scramjet/api-client";
import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";

import * as crypto from "crypto";
import * as fs from "fs";

const apiClient = new ApiClient();
const hostClient = new HostClient("http://localhost:8000/api/v1");
const instanceIds = [];

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
            const startSeqResponse = await apiClient.startSequence(sequenceClient.id, data) as any;

            accepted = startSeqResponse && startSeqResponse.data && startSeqResponse.data.id;

            if (accepted) {
                instanceIds.push(startSeqResponse.data.id);
            } else {
                full = true;
            }
        }

        if (full) {
            console.log("Host is full. Total sequences started: ", instanceIds.length);
        }
    } while (accepted && !full);

    if (instanceIds.length < minNumber) {
        assert.fail();
    }
});

Then("check if instances respond", { timeout: 60000 }, async () => {
    assert.ok(
        await Promise.all(instanceIds.map(id =>
            new Promise(async (resolve, reject) => {
                const hash = crypto.randomBytes(20).toString("hex");

                await apiClient.postEvent(id, "check", hash);
                await new Promise(res => setTimeout(res, 2000));

                try {
                    const response = await apiClient.getEvent(id);

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

    await Promise.all(instanceIds.map(id =>
        apiClient.stopInstance(id, 0, false)
    ));
});
