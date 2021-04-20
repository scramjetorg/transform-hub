/* eslint-disable no-extra-parens */
/* eslint-disable dot-notation */
import test from "ava";
import * as sinon from "sinon";

import { RunnerConfig, DelayedStream } from "@scramjet/types";
import { DockerodeDockerHelper, LifecycleDockerAdapter } from "@scramjet/supervisor";
import * as imageConfig from "@scramjet/csi-config";

import { PassThrough } from "stream";
import * as fs from "fs";
import * as fsPromises from "fs/promises";

const sandbox = sinon.createSandbox();
const configFileContents = {
    runner: "runner-example-image",
    prerunner: "pre-runner-example-image"
};

sinon.stub(fsPromises, "chmod").resolves();
sinon.stub(fs, "createWriteStream");

const createReadStreamStub = sinon.stub(fs, "createReadStream");
const mkdtempStub = sinon.stub(fsPromises, "mkdtemp").resolves();
const configStub = sinon.stub(imageConfig, "imageConfig").returns(Promise.resolve(configFileContents));
const dockerHelperMock = {
    createVolume: sinon.stub(DockerodeDockerHelper.prototype, "createVolume"),
    run: sinon.stub(DockerodeDockerHelper.prototype, "run"),
    wait: sinon.stub(DockerodeDockerHelper.prototype, "wait"),
};

sinon.stub(DelayedStream.prototype, "run");

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


    t.deepEqual(lcda["imageConfig"], configFileContents);
});

test("Init should reject on read file error.", async (t) => {
    configStub.rejects(new Error("ENOENT: File not found"));

    const lcda = new LifecycleDockerAdapter();

    await t.throwsAsync(lcda.init());
});

test("CreateFifoStreams should create monitor, control and logger streams.", async (t) => {
    configStub.resolves();

    const lcda = new LifecycleDockerAdapter();

    lcda["monitorFifoPath"] = "mfp";
    lcda["controlFifoPath"] = "cfp";
    lcda["loggerFifoPath"] = "lfp";

    const lcdaCreateFifo: sinon.SinonStub<any> = lcda["createFifo"] = sandbox.stub().resolves();

    mkdtempStub.resolves("uniqDir");

    await lcda["createFifoStreams"]("testMonitor.fifo", "testControl.fifo", "testLogger.fifo");

    t.is(lcdaCreateFifo.callCount, 3);
    t.is(lcdaCreateFifo.getCall(0).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(0).args[1], "testMonitor.fifo");
    t.is(lcdaCreateFifo.getCall(1).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(1).args[1], "testControl.fifo");
    t.is(lcdaCreateFifo.getCall(2).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(2).args[1], "testLogger.fifo");
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

    lcda["monitorFifoPath"] = "mfPath";
    lcda["controlFifoPath"] = "cfPath";

    // TODO remove when removed from code
    createReadStreamStub.returns({
        pipe: () => {}
    } as unknown as fs.ReadStream);

    configStub.resolves(configFileContents);

    dockerHelperMock.wait.resolves({
        statusCode: 0
    });

    dockerHelperMock.run.resolves({
        streams: {
            stdin: new PassThrough(),
            stdout: new PassThrough(),
            stderr: new PassThrough()
        },
        containerId: "1",
        wait: sinon.stub().resolves()
    });

    const createFifoStreams = sandbox.stub(lcda as any, "createFifoStreams").resolves();

    await lcda.init();

    lcda["monitorFifoPath"] = "path1";
    lcda["controlFifoPath"] = "path2";
    lcda["loggerFifoPath"] = "path3";

    await lcda.run(config);

    t.true(createFifoStreams.calledOnceWith("control.fifo", "monitor.fifo", "logger.fifo"));
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
    const wait = sandbox.stub().resolves();

    dockerHelperMock.createVolume.resolves(createdVolumeId);
    dockerHelperMock.run.resolves({
        streams,
        containerId: "1",
        wait
    });

    const lcda = new LifecycleDockerAdapter();

    lcda["imageConfig"].runner = configFileContents.runner;

    const res = lcda.identify(streams.stdin);

    streams.stdout.push(JSON.stringify(preRunnerResponse), "utf-8");
    streams.stdout.end();

    const identifyResponse = await res;

    t.is(dockerHelperMock.createVolume.calledOnce, true);

    const expectedResponse = {
        engines: preRunnerResponse.engines,
        version: preRunnerResponse.version,
        packageVolumeId: createdVolumeId,
        image: lcda["imageConfig"].runner,
        sequencePath: preRunnerResponse.main
    };

    t.deepEqual(identifyResponse, expectedResponse);
});
