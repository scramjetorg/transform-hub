import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";

import { StringDecoder } from "string_decoder";
import { Stream } from "stream";
import { resolve } from "path";
import { CPMClient } from "@scramjet/cpm-api-client";

const SCENARIO: number = 2;
const execPromise = (cmd: string, args: string[]) => new Promise<ChildProcess>((res, _rej) => {
    const proc = spawn(cmd, args, { env: { DEVELOPMENT: "true" } });

    res(proc);
});
const waitForText = (stream: Stream, text: string) => new Promise<void>((res, _rej) => {
    const decoder = new StringDecoder();

    stream.on("data", d => {
        const msg = decoder.write(d);

        if (msg.match(text)) {
            res();
        }
    });
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const cpmProcess = await execPromise("ts-node", ["../../../cpm/packages/cpm/src/bin/cpm"]);

    await waitForText(cpmProcess.stdout, "STH API");

    cpmProcess.stdout.pipe(process.stdout);
    cpmProcess.stderr.pipe(process.stderr);

    console.log("CPM started");

    const host1 = "11111111-c201-4fe4-8309-111111111111";
    const sequence1 = fs.createReadStream(resolve(__dirname, "../../../sth/packages/reference-apps/endless-names-output.tar.gz"));
    const sequence2 = fs.createReadStream(resolve(__dirname, "../../../sth/packages/reference-apps/hello-input-out.tar.gz"));

    // host 1
    fs.writeFileSync("/tmp/sth-id.json", JSON.stringify({ id: host1 }));

    const host1Process = await execPromise("ts-node", [resolve(__dirname, "../../../sth/packages/sth/src/bin/hub"), "-C", "localhost:7000"]);

    if (!host1Process.stdout || !host1Process.stderr) {
        console.error("Spawned STH process stdio is undefined.");
        process.exit(1);
    }

    host1Process.stdout.pipe(process.stdout);
    host1Process.stderr.pipe(process.stderr);

    await waitForText(host1Process.stdout, "Received id");

    console.log("Host 1 started");

    const cpmClient = new CPMClient("http://localhost:9000/api/v1");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let seq1, seq2, inst1, inst2;

    switch (SCENARIO) {
    case 1:
        seq1 = await cpmClient.getHostClient(host1).sendSequence(sequence1);
        seq2 = await cpmClient.getHostClient(host1).sendSequence(sequence2);

        await seq1.start({}, []);

        inst2 = await seq2.start({}, []);

        (await inst2.getStream("output")).data?.pipe(process.stdout);

        break;
    case 2:
        seq2 = await cpmClient.getHostClient(host1).sendSequence(sequence2);

        await cpmClient.sendNamedData(
            "names",
            fs.createReadStream(resolve(__dirname, "names.json")),
            "application/x-ndjson"
        ).then(() => {
            console.log("resolved");
        }).catch(e => {
            console.error(e);
        });

        inst2 = await seq2.start({}, []);

        (await inst2.getStream("output")).data?.pipe(process.stdout);

        await cpmClient.sendNamedData(
            "names",
            fs.createReadStream(resolve(__dirname, "names.json")),
            "application/x-ndjson"
        ).then(() => {
            console.log("resolved");
        }).catch(e => {
            console.error(e);
        });

        break;
    default:
        break;
    }
})();
