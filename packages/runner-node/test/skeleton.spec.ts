import test from "ava";
import { readFileSync } from "fs";
import { resolve } from "path";

import { parseBootConfigPathFromArgv, shouldForwardRunnerLogs, validateBootConfig } from "../src/boot-config";
import { createFdStreams } from "../src/fd-streams";


test("parseBootConfigPathFromArgv reads argv[2]", t => {
    const result = parseBootConfigPathFromArgv(["/usr/bin/node", "/srv/runner-node.js", "/tmp/boot.json"]);

    t.is(result, "/tmp/boot.json");
});

test("parseBootConfigPathFromArgv throws when missing", t => {
    t.throws(() => parseBootConfigPathFromArgv(["/usr/bin/node", "/srv/runner-node.js"]));
});

test("validateBootConfig requires sequencePath and instanceId", t => {
    t.throws(() => validateBootConfig({}));
    t.throws(() => validateBootConfig({ sequencePath: "" }));
    t.throws(() => validateBootConfig({ sequencePath: "/x" }), { message: /instanceId/ });
    t.deepEqual(
        validateBootConfig({ sequencePath: "/x", instanceId: "i-1" }),
        { sequencePath: "/x", instanceId: "i-1" }
    );
});

test("runner-node log forwarding defaults to enabled and honors the boot contract", t => {
    t.true(shouldForwardRunnerLogs({}));
    t.true(shouldForwardRunnerLogs({ forwardRunnerLogs: true }));
    t.false(shouldForwardRunnerLogs({ forwardRunnerLogs: false }));
    t.deepEqual(validateBootConfig({ sequencePath: "/x", instanceId: "i-1", forwardRunnerLogs: false }), {
        sequencePath: "/x", instanceId: "i-1", forwardRunnerLogs: false
    });
});

test("validateBootConfig accepts and validates instancesServerPort/Host", t => {
    t.deepEqual(
        validateBootConfig({
            sequencePath: "/x",
            instanceId: "i-1",
            instancesServerPort: 9000,
            instancesServerHost: "127.0.0.1",
        }),
        {
            sequencePath: "/x",
            instanceId: "i-1",
            instancesServerPort: 9000,
            instancesServerHost: "127.0.0.1",
        }
    );

    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", instancesServerPort: -1, instancesServerHost: "h",
    }), { message: /instancesServerPort/ });
    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", instancesServerPort: 9000, instancesServerHost: "",
    }), { message: /instancesServerHost/ });
    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", instancesServerPort: 9000,
    }), { message: /must be set together/ });
});

test("validateBootConfig accepts and validates topic metadata", t => {
    t.deepEqual(
        validateBootConfig({
            sequencePath: "/x",
            instanceId: "i-1",
            inputTopic: "topic-in",
            outputTopic: "topic-out",
        }),
        {
            sequencePath: "/x",
            instanceId: "i-1",
            inputTopic: "topic-in",
            outputTopic: "topic-out",
        }
    );

    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", inputTopic: "",
    }), { message: /inputTopic/ });
    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i", outputTopic: "",
    }), { message: /outputTopic/ });
});

test("validateBootConfig accepts and validates verser2 runtime handoff", t => {
    const verser2Runtime = {
        hostUrl: "https://verser2.example",
        runnerGuestId: "runner.i-1.guest",
        runnerRouteDomain: "runner.i-1.scramjet.internal",
        hubBrokerId: "runner.i-1.hub.broker",
        hubTargetDomain: "sth.scramjet.internal",
        tls: { caFile: "/ca.pem" },
        leaseAcquireTimeoutMs: 1000,
        minWaitingStreams: 2
    };

    t.deepEqual(
        validateBootConfig({ sequencePath: "/x", instanceId: "i-1", verser2Runtime }),
        { sequencePath: "/x", instanceId: "i-1", verser2Runtime }
    );

    t.throws(() => validateBootConfig({
        sequencePath: "/x", instanceId: "i-1", verser2Runtime: { ...verser2Runtime, hubBrokerId: "" }
    }), { message: /verser2Runtime\.hubBrokerId/ });
});

test("createFdStreams is exported for runtime bootstrap", t => {
    t.is(typeof createFdStreams, "function");
});

test("source has no references to legacy env vars", t => {
    const files = [
        "../src/boot-config.ts",
        "../src/fd-streams.ts",
        "../src/bin/runner-node.ts",
    ].map(p => resolve(__dirname, p));

    for (const file of files) {
        const src = readFileSync(file, "utf8");

        t.false(src.includes("SEQUENCE_PATH"), `${file} contains SEQUENCE_PATH`);
        t.false(src.includes("SEQUENCE_INFO"), `${file} contains SEQUENCE_INFO`);
        t.false(src.includes("RUNNER_CONNECT_INFO"), `${file} contains RUNNER_CONNECT_INFO`);
    }
});
