import { Given, Then } from "cucumber";
// const assert = require("assert").strict;
// const exec = require("child_process").exec;
// const fs = require("fs");
// const lineByLine = require("n-readlines");
// const testPath = "../fromdisk-bdd/";
// const { promisify } = require("util");


Given("runner fake is running", function() {
    //cd ../src/runner && npx ts-node index.ts
    // const child = spawn("/usr/bin/env", ["npx", "ts-node", "../src/runner/index.ts"]);

    // await new Promise(async(resolve) => {
    //     setTimeout(() => {
    //         spawn("/usr/bin/env", ["rm", testSocket]);
    //         child.kill(9);
    //     }, 8000);

    //     const data = await StringStream.from(child.stdout).lines().slice(0, 1).whenRead();
    //     t.is(data, `listening on socket ${testSocket}`);

    //     child.on("exit", function(code: any, signal: any) {
    //         if (code === 1) {
    //             t.fail("child process exited with " +
    //                 `code ${code} and signal ${signal}`);
    //         } else if (code === 0 || signal === "SIGKILL") {
    //             t.pass();
    //         }

    //         resolve(1);
    //     });
    return "pending";
});

Then("healthcheck message is printed", function() {
    // [3010,{"healthy":true}]
    return "pending";
});