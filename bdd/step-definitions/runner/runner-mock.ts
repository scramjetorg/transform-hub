import { Given, When, Then, After } from "cucumber";
import { strict as assert } from "assert";
import { spawn } from "child_process";
import { StringStream } from "scramjet";

let runner;
let runnerProcessStopped;

Given("mock runner is running", () => {
    runner = spawn("/usr/bin/env", ["npx", "ts-node", "../src/runner/index.ts"]);
    runnerProcessStopped = false;
    runner.on("exit", () => {
        runnerProcessStopped = true;
    });

    assert.equal(runnerProcessStopped, false);
});

When("message {string} is sent", (message) => {
    runner.stdin.write(`${message}\n`);
    runner.stdin.end();
});

Then("message {string} is received", async(message) => {
    const data = await StringStream.from(runner.stdout).lines().slice(0, 1).whenRead();
    assert.equal(data, message);
});

Then("mock runner is not running", async() => {
    await new Promise(resolve => setTimeout(() => resolve(1), 1000));
    assert.equal(runnerProcessStopped, true);
});

After(function() {
    if (runnerProcessStopped){
        runner.kill(9);
    }
});