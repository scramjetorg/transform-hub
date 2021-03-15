import { RunnerConfig } from "@scramjet/types/src/lifecycle";
import test from "ava";
import * as proxyquire from "proxyquire";
import * as sinon from "sinon";
import { PassThrough } from "stream";

const sandbox = sinon.createSandbox();

let mkdtempStub = sandbox.stub();
let dockerHelperMockCreateVolumeStub = sandbox.stub();
let dockerHelperMockRunStub = sandbox.stub();
let dockerHelperMockWaitStub = sandbox.stub();

class DockerHelperMock {
    createVolume = dockerHelperMockCreateVolumeStub;
    run = dockerHelperMockRunStub;
    wait = dockerHelperMockWaitStub;
}

const chmodStub = sandbox.stub();
const configFileContents = {
    runner: "runner-example-image",
    prerunner: "pre-runner-example-image"
};
const configStub = sandbox.stub();
const createReadStreamStub = sandbox.stub();

configStub.returns(Promise.resolve(configFileContents));
const { LifecycleDockerAdapter } = proxyquire("../dist/lib/adapters/docker/lifecycle-docker-adapter.js", {
    fs: {
        createReadStream: createReadStreamStub,
        createWriteStream: sandbox.stub(),
    },
    "fs/promises": {
        mkdtemp: mkdtempStub,
        chmod: chmodStub
    },
    "@scramjet/csi-config": {
        imageConfig: configStub
    },
    "@scramjet/types": {
        DelayedStream: function() {
            return { run: sandbox.stub() };
        }
    },
    "./dockerode-docker-helper": { DockerodeDockerHelper: DockerHelperMock }
});
//let lcda: typeof LifecycleDockerAdapter;

test.beforeEach(() => {
    sandbox.reset();
});

test("Constructor should create instance.", async (t: any) => {
    const lcda = new LifecycleDockerAdapter();

    t.not(lcda, null);
});

test("Init should call imageConfig and set results locally.", async (t) => {
    configStub.resolves(configFileContents);

    const lcda = new LifecycleDockerAdapter();

    await lcda.init();

    t.deepEqual(lcda.imageConfig, configFileContents);
});

test("Init should reject on read file error.", async (t) => {
    configStub.rejects(new Error("ENOENT: File not found"));

    let lcda = new LifecycleDockerAdapter();

    await t.throwsAsync(lcda.init());
});

test("CreateFifoStreams should create monitor and control streams.", async (t) => {
    configStub.resolves();

    const lcda = new LifecycleDockerAdapter();

    lcda.createFifo = sandbox.stub().resolves();

    mkdtempStub.returns("uniqDir");
    await lcda.createFifoStreams("testMonitor.fifo", "testControl.fifo");

    t.is(lcda.createFifo.callCount, 2);
    t.is(lcda.createFifo.getCall(0).args[0], "uniqDir");
    t.is(lcda.createFifo.getCall(0).args[1], "testMonitor.fifo");
    t.is(lcda.createFifo.getCall(1).args[0], "uniqDir");
    t.is(lcda.createFifo.getCall(1).args[1], "testControl.fifo");
});

test("Run should call createFifoStreams with proper parameters.", async (t) => {
    const config: RunnerConfig = {
        image: "image",
        version: "",
        engines: {
            [""]: ""
        },
        sequencePath: "sequence.js"
    };
    const lcda = new LifecycleDockerAdapter();

    // TODO remove when removed from code
    createReadStreamStub.returns({
        pipe: () => {}
    });

    dockerHelperMockWaitStub.resolves();

    dockerHelperMockRunStub.resolves({
        streams: {
            stdin: new PassThrough(),
            stdout: new PassThrough(),
            stderr: new PassThrough()
        }
    });

    lcda.createFifoStreams = sandbox.stub().resolves();

    await lcda.run(config);

    t.true(lcda.createFifoStreams.calledOnceWith("control.fifo", "monitor.fifo"));
});

test("Identify should return parsed response from stream.", async (t) => {
    const streams = {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        stderr: new PassThrough()
    };
    const createdVolumeId = "uniqueVolumeId";
    const preRunnerResponse = {
        engines: { engine1: "diesel" },
        version: "0.3.0",
        main: "example-sequence-path"
    };
    const stopAndRemove = sandbox.stub().resolves();

    dockerHelperMockCreateVolumeStub.resolves(createdVolumeId);
    dockerHelperMockRunStub.resolves({
        streams,
        stopAndRemove
    });

    const lcda = new LifecycleDockerAdapter();

    lcda.imageConfig.runner = configFileContents.runner;

    const res = lcda.identify(streams.stdin);

    streams.stdout.push(JSON.stringify(preRunnerResponse), "utf-8");
    streams.stdout.end();

    const identifyResponse = await res;

    t.is(dockerHelperMockCreateVolumeStub.calledOnce, true);

    const expectedResponse = {
        engines: preRunnerResponse.engines,
        version: preRunnerResponse.version,
        packageVolumeId: createdVolumeId,
        image: lcda.imageConfig.runner,
        sequencePath: preRunnerResponse.main
    };

    t.deepEqual(identifyResponse, expectedResponse);
});
