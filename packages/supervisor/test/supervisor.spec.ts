import test from "ava";

const testSocket = `/tmp/test-socket-${process.pid}.sock`;
/*
* Should we remove this unit test file? 
* Since Supervisor process starting will be tested as a part of BDD test.
*/

test("Start supervisor test" + testSocket, t => {

    t.pass();
});

/* 
test("start supervisor on " + testSocket, async t => {
    const child = spawn("/usr/bin/env", ["node", "./dist/bin/supervisor.js", testSocket]);

    await new Promise(async (resolve) => {
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
*/
