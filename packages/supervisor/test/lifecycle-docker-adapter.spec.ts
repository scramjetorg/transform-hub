// TODO: Move this file to @scramjet/adapters

/* eslint-disable import/no-named-as-default-member, no-extra-parens, dot-notation */
import { ConfigService } from "@scramjet/sth-config";
import { DelayedStream } from "@scramjet/model";
import { DockerodeDockerHelper, DockerInstanceAdapter, DockerSequenceAdapter } from "@scramjet/adapters";
import { SequenceConfig } from "@scramjet/types";
import test, { skip } from "ava";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as sinon from "sinon";
import { PassThrough } from "stream";

const sandbox = sinon.createSandbox();

const configService = new ConfigService({
    docker: {
        runner: {
            image: "runner-example-image",
            maxMem: 512,
            exposePortsRange: [30000, 40000],
            hostIp: "0.0.0.0"
        },
        prerunner: {
            image: "pre-runner-example-image",
            maxMem: 16
        }
    }
});

sinon.stub(fsPromises, "chmod").resolves();
sinon.stub(fs, "createWriteStream");

const createReadStreamStub = sinon.stub(fs, "createReadStream");
const mkdtempStub = sinon.stub(fsPromises, "mkdtemp").resolves();
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
    const lcdai = new DockerInstanceAdapter(); // Main?

    t.not(lcdai, null);
});

// TODO: Config is provided by PreRunner. No need to get it from global config.

skip("Init should call imageConfig and set results locally.", async () => {
    const lcdai = new DockerInstanceAdapter();

    await lcdai.init();

    // t.deepEqual(lcdai["imageConfig"], configFileContents);
});

test("CreateFifoStreams should create monitor, control logger, input and output streams.", async (t) => {
    const lcda = new DockerInstanceAdapter();

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
    const config: SequenceConfig = {
        name: "abc",
        container: { image: "image", maxMem: 2, exposePortsRange: [30000, 40000], hostIp: "0.0.0.0" },
        version: "",
        engines: {
            [""]: ""
        },
        sequencePath: "sequence.js",
        id: "abc-123",
        type: "docker"
    };
    const lcdai = new DockerInstanceAdapter();

    lcdai["monitorFifoPath"] = "mfPath";
    lcdai["controlFifoPath"] = "cfPath";

    // TODO remove when removed from code
    createReadStreamStub.returns({
        pipe: () => {}
    } as unknown as fs.ReadStream);

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
        "output.fifo"));
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

    const lcdas = new DockerSequenceAdapter(configService.getDockerConfig());

    sinon.stub(lcdas, "fetch").resolves();

    const res = lcdas.identify(streams.stdin, "abc-123");

    streams.stdout.push(JSON.stringify(preRunnerResponse), "utf-8");
    streams.stdout.end();

    await res;

    const identifyResponse = lcdas.info.getConfig();

    t.is(dockerHelperMock.createVolume.calledOnce, true);

    const expectedResponse: SequenceConfig = {
        type: "docker",
        config: {},
        name: preRunnerResponse.name,
        engines: preRunnerResponse.engines,
        version: preRunnerResponse.version,
        id: createdVolumeId,
        container: configService.getDockerConfig().runner,
        sequencePath: preRunnerResponse.main,
    };

    t.deepEqual(identifyResponse, expectedResponse);
});
