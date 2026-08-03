import test from "ava";
import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { CommonLogsPipe } from "../src/lib/common-logs-pipe";

const lineLength = 20;
const numberOfLogs = 1e4;
const highWaterMark = lineLength * numberOfLogs / 1000;
const commonLogsBufferLength = numberOfLogs / 1000;

test.serial("10k logs does not crash when commonLogsPipe is a raw PassThrough", t => {
    t.timeout(30_000);
    const commonLogsPipe = { outStream: new PassThrough({ highWaterMark }) };

    const instances = [new PassThrough(), new PassThrough()];

    instances.forEach((instance, _index) => {
        instance.on("data", (data) => /* consume data */ data);
        instance.pipe(new PassThrough()).pipe(commonLogsPipe.outStream);
    });

    return DataStream.from(async function* () {
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
        .run()
        .then(() => {
            t.pass();
        });
});

test.serial("10k logs does not pause instances streams", t => {
    t.timeout(30_000);
    const commonLogsPipe = new CommonLogsPipe(commonLogsBufferLength);

    const instances = [new PassThrough(), new PassThrough()];

    instances.forEach((instance, index) => {
        instance.on("data", (data) => /* consume data */ data);
        commonLogsPipe.addInStream(`${index}-${index}`, instance);
    });

    return DataStream.from(async function* () {
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
        .run()
        .then(() => {
            t.false(instances.some(instance => instance.isPaused()));
        });
});

test.serial("instances streams will automatically resume after a pause", t => {
    t.timeout(30_000);
    const commonLogsPipe = new CommonLogsPipe(1e3);

    const instances = [new PassThrough(), new PassThrough()];

    const areStreamsPaused = [false, false];

    instances.forEach((instance, index) => {
        instance.on("data", (data) => /* consume data */ data);
        instance.on("pause", () => { areStreamsPaused[index] = true; });
        instance.on("resume", () => { areStreamsPaused[index] = false; });
        commonLogsPipe.addInStream(`${index}-${index}`, instance);
    });

    return DataStream.from(async function* () {
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
        .run()
        .then(() => {
            t.false(instances.some(instance => instance.isPaused()));
            t.false(areStreamsPaused.some(isPaused => isPaused));
        });
});
