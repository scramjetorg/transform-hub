/* eslint-disable max-nested-callbacks */
import { Then } from "@cucumber/cucumber";
import { CustomWorld } from "../world";

import { strict as assert } from "assert";
import * as crypto from "crypto";
import * as net from "net";
import { stdout } from "process";

import { InstanceClient } from "@scramjet/api-client";
import { getLogger, addLoggerOutput } from "@scramjet/logger";
import { URL } from "url";
import { defer } from "../../lib/utils";

const logger = getLogger("Test");

addLoggerOutput(stdout, stdout);

Then("check every {int} seconds if instances respond with correct data for {float} hours on port {int}", { timeout: 3600 * 48 * 1000 }, async function(this: CustomWorld, seconds: number, timeoutHrs: number, port: number) {
    let rej: Function;

    const timePassedPromise = new Promise<boolean>((resolve, reject) => {
        rej = reject;
        setTimeout(() => {
            clearInterval(this.resources.interval);
            resolve(true);
        }, timeoutHrs * 3600 * 1000);
    });

    this.resources.interval = setInterval(async () => {
        logger.log("Start sending events...");


        await Promise.all(this.resources.instances.map(async (instance: InstanceClient) => {
            const hash = `${instance.id} ${crypto.randomBytes(20).toString("hex")}`;

            await instance.sendEvent("check", hash);

            console.log("SENT:", hash);

            await defer(500);

            const instanceInfo = (await instance.getInfo()).data;

            return new Promise<void>((resolve) => {
                const chunks: Buffer[] = [];

                let response = "";

                const client = net.createConnection({
                    port: instanceInfo?.ports[port + "/tcp"],
                    host: process.env.SCRAMJET_HOST_URL ? new URL(process.env.SCRAMJET_HOST_URL).hostname : "localhost"
                }, () => {
                    client
                        .on("data", async (chunk: Buffer) => {
                            chunks.push(chunk);
                        })
                        .on("end", () => {
                            response = chunks.join("");

                            console.log("RECV:", response);
                            if (response === hash) {
                                resolve();
                            } else {
                                rej(JSON.stringify({ id: instance.id, sent: hash, response, message: "not match" }));
                            }
                        }).on("error", (err) => rej(err));
                });
            });
        }));


    }, seconds * 1000);

    assert.ok(await timePassedPromise);
});
