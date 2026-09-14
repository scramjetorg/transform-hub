import test from "ava";
import { PassThrough, Readable } from "stream";
import { isAlreadyGoneContainerError } from "../src/docker-removal";
import { DockerSequenceAdapter } from "../src/docker-sequence-adapter";
import { DockerodeDockerHelper } from "../src/dockerode-docker-helper";

const adapterConfig = {
    prerunner: { image: "pre-runner:test", maxMem: 64 },
    runner: {},
    runnerImages: { node: "runner-node:test", python3: "runner-python:test" }
};

function runResult(statusCode: number, stdout: string, stderr = "") {
    const streams = {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough()
    };
    streams.stdout.end(stdout);
    streams.stderr.end(stderr);
    return { streams, wait: async () => ({ statusCode }), containerId: "pre-runner-container" };
}

test("pre-runner non-zero exit preserves bounded diagnostics", async t => {
    const adapter = new DockerSequenceAdapter({ adapters: { docker: adapterConfig } } as any);
    const stderr = "chown: Operation not permitted\n" + "x".repeat(20 * 1024);
    (adapter as any).dockerHelper = {
        createVolume: async () => "sequence-volume",
        run: async () => runResult(1, "", stderr)
    };

    const error = await t.throwsAsync(() => adapter.identify(Readable.from([]), "candidate"));

    t.is((error as any)?.code, "PRERUNNER_ERROR");
    t.deepEqual((error as any)?.data, {
        stage: "pre-runner",
        image: "pre-runner:test",
        volume: "sequence-volume",
        status: 1,
        stdout: "",
        stderr: stderr.slice(0, 16 * 1024)
    });
});

test("runner image fetch failure is reported separately from pre-runner failure", async t => {
    const adapter = new DockerSequenceAdapter({ adapters: { docker: adapterConfig } } as any);
    (adapter as any).dockerHelper = {
        createVolume: async () => "sequence-volume",
        run: async () => runResult(0, JSON.stringify({
            name: "candidate",
            version: "1.0.0",
            main: "index.js",
            engines: { node: ">=22" }
        }))
    };
    (adapter as any).fetch = async () => { throw new Error("registry unavailable"); };

    const error = await t.throwsAsync(() => adapter.identify(Readable.from([]), "candidate"));

    t.is((error as any)?.code, "DOCKER_ERROR");
    t.is((error as any)?.data.stage, "runner-image-fetch");
    t.is((error as any)?.data.image, "runner-node:test");
});

test("pre-runner image pull failure logs bounded private diagnostics and throws a generic error", async t => {
    const adapter = new DockerSequenceAdapter({ adapters: { docker: adapterConfig } } as any);
    const logged: unknown[] = [];
    const message = "registry unavailable " + "x".repeat(20 * 1024);
    (adapter as any).dockerHelper = {
        pullImage: async () => { throw new Error(message); }
    };
    (adapter as any).logger = {
        trace: () => undefined,
        error: (...args: unknown[]) => logged.push(args),
        info: () => undefined
    };

    const error = await t.throwsAsync(() => adapter.init());

    t.is((error as any)?.code, "DOCKER_ERROR");
    t.is((error as any)?.data, undefined);
    t.deepEqual(logged, [["Pre-runner image pull failed", {
        stage: "pre-runner-image-pull",
        image: "pre-runner:test",
        error: message.slice(0, 16 * 1024)
    }]]);
});

test("Docker image pull rejects when progress callback reports an error", async t => {
    const helper = new DockerodeDockerHelper();
    const pullError = new Error("registry unavailable");
    (helper as any).dockerode = {
        pull: async () => ({}),
        modem: {
            followProgress: (_stream: unknown, callback: (error?: Error) => void) => callback(pullError)
        }
    };

    const error = await t.throwsAsync(() => helper.pullImage("pre-runner:test", false));

    t.is(error, pullError);
});

test("Passing test", (t) => {
    t.pass();
});

test("Docker container cleanup accepts only already-gone 304/404 responses", async t => {
    t.true(isAlreadyGoneContainerError({ statusCode: 304 }));
    t.true(isAlreadyGoneContainerError({ statusCode: 404 }));
    t.false(isAlreadyGoneContainerError({ statusCode: 403 }));
    t.false(isAlreadyGoneContainerError({ statusCode: 500 }));
});

test("Docker container cleanup propagates genuine failures", async t => {
    for (const error of [403, 500, undefined]) {
        const failure = new Error(error === undefined ? "network" : `Docker ${error}`) as Error & { statusCode?: number };
        failure.statusCode = error;
        t.false(isAlreadyGoneContainerError(failure));
    }
});

import { isAlreadyGoneVolumeError } from "../src/docker-removal";

test("Docker volume remove accepts only already-gone 404 responses via predicate", async t => {
    t.true(isAlreadyGoneVolumeError({ statusCode: 404 }));
    t.false(isAlreadyGoneVolumeError({ statusCode: 304 }));
    t.false(isAlreadyGoneVolumeError({ statusCode: 403 }));
    t.false(isAlreadyGoneVolumeError({ statusCode: 500 }));
});

test("Docker volume remove propagates 304, 403, 500, and network errors as genuine failures", async t => {
    for (const error of [304, 403, 500, undefined]) {
        const failure = new Error(error === undefined ? "network" : `Docker ${error}`) as Error & { statusCode?: number };
        failure.statusCode = error;
        t.false(isAlreadyGoneVolumeError(failure), `expected ${error ?? "network"} to propagate`);
    }
});
