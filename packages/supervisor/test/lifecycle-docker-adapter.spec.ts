import { RunnerConfig } from "@scramjet/types/src/lifecycle";

import test from "ava";
import * as sinon from "sinon";
import { PassThrough } from "stream";

const proxyquire = require("proxyquire");
const sandbox = sinon.createSandbox();

let readFileStub = sandbox.stub();

let dockerHelperMockCreateVolumeStub = sandbox.stub();
let dockerHelperMockRunStub = sandbox.stub();

class DockerHelperMock {
    createVolume = dockerHelperMockCreateVolumeStub;
    run = dockerHelperMockRunStub
}

let { LifecycleDockerAdapter } = proxyquire("@scramjet/supervisor/dist/lib/adapters/docker/lifecycle-docker-adapter.js", {
    fs: {
        readFile: readFileStub
    },
    "./dockerode-docker-helper": { DockerodeDockerHelper: DockerHelperMock }
});


//let lcda: typeof LifecycleDockerAdapter;
let configFileContents = {
    runner: "runner-example-image",
    prerunner: "pre-runner-example-image"
};

test.beforeEach(() => {
    sandbox.reset();

});

test("Constructor should create instance.", async (t: any) => {
    let lcda = new LifecycleDockerAdapter();

    t.not(lcda, null);
});

test("Init should read file and set config.", async (t) => {
    readFileStub.reset();
    readFileStub.yields(null, JSON.stringify(configFileContents));

    let lcda = new LifecycleDockerAdapter();

    await lcda.init();

    t.is(readFileStub.callCount, 1);

    t.deepEqual(lcda.imageConfig, configFileContents);
});


test("Init should reject on read file error.", async (t) => {
    readFileStub.reset();
    readFileStub.yields(new Error(), null);

    let lcda = new LifecycleDockerAdapter();
    await t.throwsAsync(lcda.init());
});

test("Run should call createFifoStreams with proper parameters.", async (t) => {
    const config: RunnerConfig = {
        image: "image",
        version: "",
        engines: {
            [""]: ""
        }
    };

    let lcda = new LifecycleDockerAdapter();
    let createFifoStreamsSpy = sandbox.spy(lcda, "createFifoStreams");

    lcda.run(config);

    t.true(createFifoStreamsSpy.calledOnceWith("monitor.fifo", "control.fifo"));
    createFifoStreamsSpy.restore();
});

test("Run should exit with 0.", async (t: any) => {
    const config: RunnerConfig = {
        image: "image",
        version: "",
        engines: {
            [""]: ""
        }
    };

    let lcda = new LifecycleDockerAdapter();
    let res = await lcda.run(config);

    t.is(res, 0);
});

test("Identify should return response from stream with added packageVolumeId and image.", async (t) => {
    let streams = {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough()
    };

    const createdVolumeId = "uniqueVolumeId";
    const preRunnerResponse = {
        engines: { engine1: "diesel" },
        version: "0.3.0"
    };

    let stopAndRemove = sandbox.stub().resolves();

    dockerHelperMockCreateVolumeStub.resolves(createdVolumeId);
    dockerHelperMockRunStub.resolves({
        streams,
        stopAndRemove
    });

    let lcda = new LifecycleDockerAdapter();
    lcda.imageConfig.runner = configFileContents.runner;

    let res = lcda.identify(streams.stdin);

    streams.stdout.push(JSON.stringify(preRunnerResponse), "utf-8");
    streams.stdout.end();

    let identifyResponse = await res;

    t.is(dockerHelperMockCreateVolumeStub.calledOnce, true);

    let expectedResponse = {
        ...preRunnerResponse,
        packageVolumeId: createdVolumeId,
        image: lcda.imageConfig.runner
    };

    t.deepEqual(identifyResponse, expectedResponse);
});
