/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";

import { StringDecoder } from "string_decoder";
import { Stream } from "stream";
import { resolve } from "path";
// eslint-disable-next-line import/no-relative-packages
import { HostClient } from "../../packages/api-client/src/host-client";

const scenarios = `
/**
 * 1 - Send data from one instance to another one on the same host and get it's output.
 */
`;

let scenario = 0;

console.log(scenarios);

//
const execPromise = (cmd: string, args: string[]) => new Promise<ChildProcess>((res, _rej) => {
    const proc = spawn(cmd, args, { env: { DEVELOPMENT: "true", PATH: process.env.PATH } });

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
    scenario = await new Promise(res => {
        require("readline").createInterface({
            input: process.stdin,
            output: process.stdout
        }).question("Select scenario: ", (s: any) => {
            res(parseInt(s, 10));
        });
    });

    const host1 = "11111111-c201-4fe4-8309-111111111111";
    const sequence1 = fs.createReadStream(resolve(__dirname, "../../packages/reference-apps/endless-names-output.tar.gz"));
    const sequence2 = fs.createReadStream(resolve(__dirname, "../../packages/reference-apps/hello-input-out.tar.gz"));
    //
    //
    const startHost1 = async (config: { cpm: boolean }) => {
        fs.writeFileSync("/tmp/sth-id.json", JSON.stringify({ id: host1 }));
        let args = [resolve(__dirname, "../../packages/sth/src/bin/hub.ts"), "-S", "/tmp/s1", "-P", "8001"];

        if (config.cpm) {
            args = args.concat(["-C", "localhost:7000"]);
        }

        const host1Process = await execPromise("ts-node", args);

        if (!host1Process.stdout || !host1Process.stderr) {
            console.error("Spawned STH process stdio is undefined.");
            process.exit(1);
        }

        host1Process.stdout.pipe(process.stdout);
        host1Process.stderr.pipe(process.stderr);

        if (config.cpm) {
            await waitForText(host1Process.stdout, "Received id");
        } else {
            await waitForText(host1Process.stdout, "API listening");
        }

        console.log("Host 1 started");
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let seq1, seq2, inst1, inst2;

    switch (scenario) {
    case 1:
        await startHost1({ cpm: false });

        const hostCllient = new HostClient("http://localhost:8001/api/v1");

        seq1 = await hostCllient.sendSequence(sequence1);
        seq2 = await hostCllient.sendSequence(sequence2);

        inst1 = await seq1.start({}, []);
        inst2 = await seq2.start({}, []);

        (await inst2.getStream("output")).data?.pipe(process.stdout);

        break;
    default:
        console.log("unknown scenario");
        break;
    }
})();
