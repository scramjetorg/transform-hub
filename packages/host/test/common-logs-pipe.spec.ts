import { DataStream } from "scramjet";
import { PassThrough } from "stream";
import { CommonLogsPipe } from "../src/lib/common-logs-pipe";
import test from "ava";

const lineLength = 20;
const numberOfLogs = 1e4;
const highWaterMark = lineLength * numberOfLogs / 4;
const commonLogsBufferLength = numberOfLogs / 4;

test("10k logs pauses instances streams if commonLogsPipe is a PassThrough", async (t) => {
    const commonLogsPipe = { outStream: new PassThrough({ highWaterMark }) };

    const instances = [new PassThrough(), new PassThrough()];

    instances.forEach((instance, index) => {
        instance.on("data", (data) => /* consume data */ data);
        CommonLogsPipe.prototype.addInStream.call(commonLogsPipe, `${index}-${index}`, instance);
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

    instances.forEach((instance, index) => {
        instance.on("data", (data) => /* consume data */ data);
        // THIS NEVER GETS CALLED
        instance.on("pause", () => console.log(`pause ${index}`));
        instance.on("resume", () => console.log(`resume ${index}`));
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
});
