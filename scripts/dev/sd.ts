import { ChildProcess, spawn } from "child_process";
import * as fs from "fs";

import { StringDecoder } from "string_decoder";
import { Stream } from "stream";
import { resolve } from "path";
import { CPMClient } from "@scramjet/cpm-api-client";
import { HostClient } from "@scramjet/api-client";

const scenarios = `
/**
 * 1 - Send data from one instance to another one on the same host and get it's output.
 * 2 - Send data to CPM, start instance consuming data, get it's output.
 * 3 - Send data to STH1, get data from CPM
 * 4 - Send data to STH1, get data from STH2 (opr)
 *
 * 5 - Send to STH, received via CPM api
 * 6 - Send to STH1 get from STH1
 * 7 - Send to STH1 get output instance on STH2
 * 8 - Instance on STH1 provides data, Get from CPM
 * 9 - Instance on STH1 provided data, get from STH2
 * 10 - send to CPM, get from STH1
 *
 */
`;

let scenario = 0;

console.log(scenarios);

//
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
    scenario = await new Promise(res => {
        require("readline").createInterface({
            input: process.stdin,
            output: process.stdout
        }).question("Select scenario: ", (s) => {
            res(parseInt(s, 10));
        });
    });

    const host1 = "11111111-c201-4fe4-8309-111111111111";
    const host2 = "22222222-c201-4fe4-8309-222222222222";
    const sequence1 = fs.createReadStream(resolve(__dirname, "../../../sth/packages/reference-apps/endless-names-output.tar.gz"));
    const sequence2 = fs.createReadStream(resolve(__dirname, "../../../sth/packages/reference-apps/hello-input-out.tar.gz"));
    //
    const startCMP = async () => {
        const cpmProcess = await execPromise("ts-node", ["../../../cpm/packages/cpm/src/bin/cpm"]);

        await waitForText(cpmProcess.stdout, "STH API");

        cpmProcess.stdout.pipe(process.stdout);
        cpmProcess.stderr.pipe(process.stderr);

        console.log("CPM started");
    };
    //
    const startHost1 = async (config: { cpm: boolean }) => {
        fs.writeFileSync("/tmp/sth-id.json", JSON.stringify({ id: host1 }));
        let args = [resolve(__dirname, "../../../sth/packages/sth/src/bin/hub"), "-S", "/tmp/s1", "-P", "8001"];

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
    const startHost2 = async (config: { cpm: boolean }) => {
        fs.writeFileSync("/tmp/sth-id.json", JSON.stringify({ id: host2 }));

        let args = [resolve(__dirname, "../../../sth/packages/sth/src/bin/hub"), "-S", "/tmp/s2", "-P", "8002"];

        if (config.cpm) {
            args = args.concat(["-C", "localhost:7000"]);
        }

        const host2Process = await execPromise("ts-node", args);

        host2Process.stdout.pipe(process.stdout);
        host2Process.stderr.pipe(process.stderr);

        if (config.cpm) {
            await waitForText(host2Process.stdout, "Received id");
        } else {
            await waitForText(host2Process.stdout, "API listening");
        }

        console.log("Host 2 started");
    };
    const cpmClient = new CPMClient("http://localhost:9000/api/v1");

    /*
    await startCMP();
    await startHost1();
    await startHost2();
    */

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let seq1, seq2, inst1, inst2;

    switch (scenario) {
    case 1:
        await startHost1({ cpm: false });

        const hostCllient = new HostClient("http://localhost:8001/api/v1");

        seq1 = await hostCllient.sendSequence(sequence1);
        seq2 = await hostCllient.sendSequence(sequence2);

        await seq1.start({}, []);

        inst2 = await seq2.start({}, []);

        (await inst2.getStream("output")).data?.pipe(process.stdout);

        break;
    case 2:
        //Send data to CPM, start instance consuming data, get it's output.
        await startCMP();
        await startHost1({ cpm: true });

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

        break;
    case 3:
        await startCMP();
        await startHost1({ cpm: true });

        const hostClient = new HostClient("http://localhost:8001/api/v1");

        await hostClient.sendNamedData(
            "names",
            fs.createReadStream(resolve(__dirname, "names.json")),
            "application/x-ndjson"
        ).then(() => {
            console.log("resolved");
        }).catch(e => {
            console.error(e);
        });

        (await cpmClient.getNamedData("names")).data?.pipe(process.stdout);

        break;
    case 4:
        //Send data to STH1, get data from STH2 (opr)
        await startCMP();
        await startHost1({ cpm: true });
        await startHost2({ cpm: true });

        const hostClient1 = new HostClient("http://localhost:8001/api/v1");
        const hostClient2 = new HostClient("http://localhost:8002/api/v1");

        await hostClient1.sendNamedData(
            "names",
            fs.createReadStream(resolve(__dirname, "names.json")),
            "application/x-ndjson"
        ).then(() => {
            console.log("resolved");
        }).catch(e => {
            console.error(e);
        });

        (await hostClient2.getNamedData("names")).data?.pipe(process.stdout);

        break;
    default:
        console.log("unknown scenario");
        break;
    }
})();
