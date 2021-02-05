import test from 'ava';
import { StringStream } from 'scramjet';
import { spawn } from 'child_process';

const testSocket = "/tmp/test-socketx.sock";

test("start supervisor on " + testSocket, async t => {
    const child = spawn("/usr/bin/env", ["npx", "ts-node", "bin/supervisor.ts", testSocket]);

    await new Promise(async (resolve) => {
        //TODO const data = await StringStream.from(child.stdout).whenRead(10);
        setTimeout(async () => {
            spawn("/usr/bin/env", ["rm", testSocket]);
            child.kill(9);
        }, 3000);

        child.on('exit', function (code: any, signal: any) {
            if (code == 1) {
                t.fail('child process exited with ' +
                `code ${code} and signal ${signal}`);
            } else if (code == 0 || 'SIGKILL' == signal) {
                t.pass();
            }

            resolve(1);
        })
    });
});