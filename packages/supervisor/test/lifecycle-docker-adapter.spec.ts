// TODO: Move this file to @scramjet/adapters

/* eslint-disable import/no-named-as-default-member, no-extra-parens, dot-notation */
import { configService } from "@scramjet/sth-config";
import { DelayedStream } from "@scramjet/model";
import { DockerodeDockerHelper, LifecycleDockerAdapterInstance, LifecycleDockerAdapterSequence } from "@scramjet/adapters";
import { RunnerConfig } from "@scramjet/types";
import test, { skip } from "ava";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as sinon from "sinon";
import { PassThrough } from "stream";

const sandbox = sinon.createSandbox();
const configFileContents = {
    runner: {
        image: "runner-example-image",
        maxMem: 512
    },
    prerunner: {
        image: "pre-runner-example-image",
        maxMem: 16
    }
};

sinon.stub(fsPromises, "chmod").resolves();
sinon.stub(fs, "createWriteStream");

const configStub = sinon.stub(configService, "getDockerConfig").returns(configFileContents);
const createReadStreamStub = sinon.stub(fs, "createReadStream");
const mkdtempStub = sinon.stub(fsPromises, "mkdtemp").resolves();
const dockerHelperMock = {
    createVolume: sinon.stub(DockerodeDockerHelper.prototype, "createVolume"),
    run: sinon.stub(DockerodeDockerHelper.prototype, "run"),
    wait: sinon.stub(DockerodeDockerHelper.prototype, "wait"),
    pullImage: sinon.stub(DockerodeDockerHelper.prototype, "pullImage").resolves(),
};

sinon.stub(DelayedStream.prototype, "run");

test.beforeEach(() => {
    sandbox.reset();
});

test("Constructor should create instance.", async (t: any) => {
    const lcdai = new LifecycleDockerAdapterInstance(); // Main?

    t.not(lcdai, null);
});

// TODO: Config is provided by PreRunner. No need to get it from global config.

skip("Init should call imageConfig and set results locally.", async () => {
    configStub.returns(configFileContents);

    const lcdai = new LifecycleDockerAdapterInstance();

    await lcdai.init();

    // t.deepEqual(lcdai["imageConfig"], configFileContents);
});

// TODO: Useless till config is not provided with "require"
skip("Init should reject on read file error.", async (t) => {
    configStub.throws(new Error("ENOENT: File not found"));

    const lcdai = new LifecycleDockerAdapterInstance();

    await t.throwsAsync(lcdai.init());
});

test("CreateFifoStreams should create monitor, control logger, input and output streams.", async (t) => {
    configStub.returns(configFileContents);

    const lcda = new LifecycleDockerAdapterInstance();

    lcda["monitorFifoPath"] = "mfp";
    lcda["controlFifoPath"] = "cfp";
    lcda["loggerFifoPath"] = "lfp";

    const lcdaCreateFifo: sinon.SinonStub<any> =
        lcda["createFifo"] =
        sandbox.stub().resolves();

    mkdtempStub.resolves("uniqDir");
    const xxx = Math.random().toString().substr(1);

    await lcda["createFifoStreams"](
        `testMonitor${xxx}.fifo`,
        `testControl${xxx}.fifo`,
        `testLogger${xxx}.fifo`,
        `testInput${xxx}.fifo`,
        `testOutput${xxx}.fifo`
    );

    t.is(lcdaCreateFifo.callCount, 5);
    t.is(lcdaCreateFifo.getCall(0).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(0).args[1], `testMonitor${xxx}.fifo`);
    t.is(lcdaCreateFifo.getCall(1).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(1).args[1], `testControl${xxx}.fifo`);
    t.is(lcdaCreateFifo.getCall(2).args[0], "uniqDir"); // err: Cannot read property args of null
    t.is(lcdaCreateFifo.getCall(2).args[1], `testLogger${xxx}.fifo`);
    t.is(lcdaCreateFifo.getCall(3).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(3).args[1], `testInput${xxx}.fifo`);
    t.is(lcdaCreateFifo.getCall(4).args[0], "uniqDir");
    t.is(lcdaCreateFifo.getCall(4).args[1], `testOutput${xxx}.fifo`);
});

test("Run should call createFifoStreams with proper parameters.", async (t) => {
    const config: RunnerConfig = {
        name: "abc",
        container: { image: "image", maxMem: 2 },
        version: "",
        engines: {
            [""]: ""
        },
        sequencePath: "sequence.js",
        packageVolumeId: "abc-123"
    };
    const lcdai = new LifecycleDockerAdapterInstance();

    lcdai["monitorFifoPath"] = "mfPath";
    lcdai["controlFifoPath"] = "cfPath";

    // TODO remove when removed from code
    createReadStreamStub.returns({
        pipe: () => {}
    } as unknown as fs.ReadStream);

    configStub.returns(configFileContents);

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

    const createFifoStreams = sandbox.stub(lcdai as any, "createFifoStreams").resolves();

    await lcdai.init();

    t.true(dockerHelperMock.pullImage.calledOnceWith("runner-example-image", true));

    lcdai["monitorFifoPath"] = "path1";
    lcdai["controlFifoPath"] = "path2";
    lcdai["loggerFifoPath"] = "path3";
    lcdai["inputFifoPath"] = "path4";
    lcdai["outputFifoPath"] = "path5";

    await lcdai.run(config);

    // ToDo: fixup - Value is not `true`:
    t.true(createFifoStreams.calledOnceWith(
        "control.fifo",
        "monitor.fifo",
        "logger.fifo",
        "input.fifo",
        "output.fifo"
    ));
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
        name: "abc",
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

    const lcdas = new LifecycleDockerAdapterSequence();
    const res = lcdas.identify(streams.stdin, "abc-123");

    streams.stdout.push(JSON.stringify(preRunnerResponse), "utf-8");
    streams.stdout.end();

    configStub.returns(configFileContents);

    const identifyResponse = await res;

    t.is(dockerHelperMock.createVolume.calledOnce, true);

    const expectedResponse: RunnerConfig = {
        config: {},
        name: preRunnerResponse.name,
        engines: preRunnerResponse.engines,
        version: preRunnerResponse.version,
        packageVolumeId: createdVolumeId,
        container: configFileContents.runner,
        sequencePath: preRunnerResponse.main
    };

    t.deepEqual(identifyResponse, expectedResponse);
});
