import test from "ava";
import { StringStream } from "scramjet";
import { spawn } from "child_process";

const testSocket = `/tmp/test-socket-${process.pid}.sock`;

test("start supervisor on " + testSocket, async t => {
    const child = spawn("/usr/bin/env", ["node", "../../dist/supervisor/bin/supervisor.js", testSocket]);

    await new Promise(async(resolve) => {
        setTimeout(() => {
            spawn("/usr/bin/env", ["rm", testSocket]);
            child.kill(9);
        }, 8000);

        const data = await StringStream.from(child.stdout).lines().slice(0, 1).whenRead();
        t.is(data, `listening on socket ${testSocket}`);

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
