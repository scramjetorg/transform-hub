/* eslint-disable no-console */
import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { CommonLogsPipe } from "../src/lib/common-logs-pipe";
import test from "ava";

const lineLength = 20;
const numberOfLogs = 1e4;
const highWaterMark = lineLength * numberOfLogs / 1000;
const commonLogsBufferLength = numberOfLogs / 1000;

test("10k logs pauses instances streams if commonLogsPipe is a PassThrough", async (t) => {
    const commonLogsPipe = { outStream: new PassThrough({ highWaterMark }) };

    const instances = [new PassThrough(), new PassThrough()];

    instances.forEach((instance, _index) => {
        instance.on("data", (data) => /* consume data */ data);
        instance.pipe(new PassThrough()).pipe(commonLogsPipe.outStream);
    });

    await DataStream.from(async function* () {
        let i = 0;

        while (i < numberOfLogs) {
            yield ++i;
        }
    })
        .do((index) => {
            instances.forEach(instance => {
                instance.write(`Log ${index}`);
            });
        })
        .run();

    t.assert(instances.every(instance => instance.isPaused() === true));
});

test("10k logs does not pause instances streams", async (t) => {
    const commonLogsPipe = new CommonLogsPipe(commonLogsBufferLength);

    const instances = [new PassThrough(), new PassThrough()];

    instances.forEach((instance, index) => {
        instance.on("data", (data) => /* consume data */ data);
        commonLogsPipe.addInStream(`${index}-${index}`, instance);
    });

    await DataStream.from(async function* () {
        let i = 0;

        while (i < numberOfLogs) {
            yield ++i;
        }
    })
        .do((index) => {
            instances.forEach(instance => {
                instance.write(`Log ${index}`);
            });
        })
        .run();

    t.assert(instances.every(instance => instance.isPaused() === false));
});

test("instances streams will automatically resume after a pause", async (t) => {
    const commonLogsPipe = new CommonLogsPipe(1e3);

    const instances = [new PassThrough(), new PassThrough()];

    const areStreamsPaused = [false, false];

    instances.forEach((instance, index) => {
        instance.on("data", (data) => /* consume data */ data);
        instance.on("pause", () => { areStreamsPaused[index] = true; });
        instance.on("resume", () => { areStreamsPaused[index] = false; });
        commonLogsPipe.addInStream(`${index}-${index}`, instance);
    });

    await DataStream.from(async function* () {
        let i = 0;

        while (i < 1e4) {
            yield ++i;
        }
    })
        .do((index) => {
            instances.forEach(instance => {
                instance.write(`Log ${index}`);
            });
        })
        .run();

    t.assert(instances.every(instance => instance.isPaused() === false));
    t.assert(areStreamsPaused.every(isPaused => isPaused === false));
});
