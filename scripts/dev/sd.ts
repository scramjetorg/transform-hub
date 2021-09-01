import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";

import { HostClient } from "@scramjet/api-client";
import { StringDecoder } from "string_decoder";
import { Stream } from "stream";
const execPromise = (cmd: string, args: string[]) => new Promise<ChildProcess>((resolve, _reject) => {
    const proc = spawn(cmd, args);

    resolve(proc);
});
const waitForText = (stream: Stream, text: string) => new Promise<void>((resolve, _reject) => {
    const decoder = new StringDecoder();

    stream.on("data", d => {
        const msg = decoder.write(d);

        if (msg.match(text)) {
            resolve();
        }
    });
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const host1 = "11111111-c201-4fe4-8309-111111111111";
    const sequence1 = fs.createReadStream("../../../sth/packages/reference-apps/multi-outputs.tar.gz");
    const sequence2 = fs.createReadStream("../../../sth/packages/reference-apps/hello-input-out.tar.gz");

    // host 1
    fs.writeFileSync("/tmp/sth-id.json", JSON.stringify({ id: host1 }));

    const host1Process = await execPromise("ts-node", ["../../../sth/packages/sth/src/bin/hub"]);

    host1Process.stdout.pipe(process.stdout);
    host1Process.stderr.pipe(process.stderr);

    await waitForText(host1Process.stdout, "API listening on port");

    console.log("Host 1 started");

    const hostClient = new HostClient("http://localhost:8000/api/v1");
    const seq1 = await hostClient.sendSequence(sequence1);
    const seq2 = await hostClient.sendSequence(sequence2);
    //

    await seq1.start({}, []);

    const inst2 = await seq2.start({}, []);
    //
    //const inst1Output = (await inst1.getStream("output")).data;

    //await inst2.sendStream("input", inst1Output, { type: "application/x-ndjson", end: false });

    (await inst2.getStream("output")).data.pipe(process.stdout);
})();
