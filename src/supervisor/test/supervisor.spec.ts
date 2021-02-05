import test from "ava";
import { StringStream } from "scramjet";
import { spawn } from "child_process";

const testSocket = `/tmp/test-socket-${process.pid}.sock`;

test("start supervisor on " + testSocket, async t => {
    const child = spawn("/usr/bin/env", ["npx", "ts-node", "bin/supervisor.ts", testSocket]);

    await new Promise(async(resolve) => {
        setTimeout(async() => {
            spawn("/usr/bin/env", ["rm", testSocket]);
            child.kill(9);
        }, 8000);

        const data = await StringStream.from(child.stdout).lines().slice(0, 1).whenRead();
        console.log(data);

        child.on("exit", function(code: any, signal: any) {
            if (code === 1) {
                t.fail("child process exited with " +
                    `code ${code} and signal ${signal}`);
            } else if (code === 0 || signal === "SIGKILL") {
                t.pass();
            }

            resolve(1);
        });
    });
});