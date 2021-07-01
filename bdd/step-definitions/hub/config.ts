import { Then, When } from "@cucumber/cucumber";
import { CustomWorld } from "../world";

import { HostClient } from "@scramjet/api-client";

import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import * as net from "net";
import path = require("path");
import { SIGTERM } from "constants";

When("hub process is started with parameters {string}", async function(this: CustomWorld, params: string) {
    await new Promise<void>(async (resolve, reject) => {
        this.resources.hub = spawn(
            "node", [path.resolve(__dirname, "../../../dist/sth/bin/hub"), ...params.split(" ")],
            {
                detached: true
            }
        );

        if (process.env.SCRAMJET_TEST_LOG) {
            this.resources.hub?.stdout?.pipe(process.stdout);
            this.resources.hub?.stderr?.pipe(process.stderr);
        }

        this.resources.hub.on("error", reject);

        this.resources.hubStdoutChunks = [];

        for await (const chunk of this.resources.hub.stdout) {
            this.resources.hubStdoutChunks.push(chunk);

            if (~this.resources.hubStdoutChunks.join("").indexOf("API listening on port")) {
                break;
            }
        }

        resolve();
    });
});

Then("API is available on port {int}", async function(this: CustomWorld, port: number) {
    const hostClient = new HostClient(`http://127.0.0.1:${port}/api/v1`);
    const status = (await hostClient.getVersion()).status;

    assert.equal(status, 200);
});

Then("SocketServer starts on {string}", async function(this: CustomWorld, socketPath: string) {
    await new Promise<void>((resolve, reject) => {
        const connection = net.createConnection({
            path: socketPath
        });

        connection.once("connect", () => {
            connection.end();
            resolve();
        });

        connection.once("error", (error) => {
            reject(error);
        });
    });
});

Then("API starts with {string} server name", async function(this: CustomWorld, server: string) {
    const hostClient = new HostClient(`http://${server}:8000/api/v1`);
    const status = (await hostClient.getVersion()).status;

    assert.equal(status, 200);

    const apiURL = this.resources.hubStdoutChunks.join().match(/port: \s*(.*)/)[1];

    assert.equal(new RegExp(server).test(apiURL), true);
});

Then("exit hub process", async function(this: CustomWorld) {
    await new Promise<void>(async (resolve) => {
        const hub = this.resources.hub as ChildProcess;

        hub.on("close", resolve);

        hub.kill(SIGTERM);
    });
});

