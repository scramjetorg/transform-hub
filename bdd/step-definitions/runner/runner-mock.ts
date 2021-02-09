// import { Given, When, Then, After } from "cucumber";
// // import { promisify } from "util";
// import { strict as assert } from "assert";
// import { spawn } from "child_process";
// import { StringStream } from "scramjet";

const assert = require("assert");
const spawn = require("child_process").spawn;
const { StringStream } = require("scramjet");
const { Given, Then, When, After } = require("cucumber");

Given("mock runner is running", () => {
    this.runner = spawn("/usr/bin/env", ["npx", "ts-node", "../src/runner/index.ts"]);
    this.runnerProcessStopped = false;
    this.runner.on("exit", () => {
        this.runnerProcessStopped = true;
    });

    assert.equal(this.runnerProcessStopped, false);
});

When("message {string} is sent", (message) => {
    this.runner.stdin.write(`${message}\n`);
    this.runner.stdin.end();
});

Then("message {string} is received", async(message) => {
    const data = await StringStream.from(this.runner.stdout).lines().slice(0, 1).whenRead();
    assert.equal(data, message);
});

Then("mock runner is not running", async() => {
    await new Promise(resolve => setTimeout(() => resolve(1), 1000));
    assert.equal(this.runnerProcessStopped, true);
});

After(function() {
    if (this.runnerProcessStopped){
        this.runner.kill(9);
    }
});