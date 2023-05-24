import BackupingStream from "../src/backupingStream";
import { createReadStream, createWriteStream } from "fs";
import { FileHandle, mkdir, open } from "fs/promises";
import { resolve } from "path";
import { PassThrough } from "stream";
import { createInterface } from "readline";
import { EOL } from "os";

const testText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis eget nisl viverra, efficitur eros quis, sodales eros. Suspendisse feugiat ac ipsum non aliquam. Quisque dapibus nisi libero. Fusce euismod lacus vitae eros suscipit semper in non dui. Sed quis porttitor elit. Nulla a sapien mi. Suspendisse tempus vitae lectus a lobortis. Phasellus et gravida purus, et porta mauris. Integer urna nulla, semper nec leo id, ultrices bibendum odio. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aenean eu iaculis dui. Ut ac dolor aliquet, placerat sapien vitae, hendrerit purus.

Proin porta cursus erat, ut dignissim felis. Suspendisse potenti. Duis et aliquet odio. Aliquam congue blandit dolor non dapibus. Vivamus eros dolor, vulputate vitae arcu vel, pretium porttitor lorem. Vivamus eget quam quis arcu lacinia malesuada id a sem. Maecenas in ligula orci. Sed dapibus, urna vel malesuada dictum, lectus ex convallis ante, eget tempor lorem ante ac lectus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Suspendisse enim ante, laoreet at urna vel, malesuada vestibulum nulla. Morbi orci metus, imperdiet in mattis a, tincidunt vitae tortor. Vivamus at consectetur mauris.

In eu nulla luctus, lacinia nulla sit amet, condimentum leo. Vivamus lectus ex, venenatis in nulla eu, congue rutrum sapien. Cras suscipit sed elit non blandit. Nullam volutpat facilisis elit at laoreet. Aliquam mattis quis sem eget rutrum. Duis sapien dui, tincidunt nec ipsum id, rutrum pulvinar purus. Maecenas ut euismod purus, vel porta lacus. Vestibulum sit amet nulla sit amet diam rhoncus pharetra nec at purus. Donec mattis diam sit amet nisi tincidunt accumsan. Donec a nunc sed tortor dictum finibus. In ultricies lectus non urna convallis mollis. Pellentesque aliquam metus ante, laoreet porttitor mauris sodales et. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nullam quis laoreet nisl. Praesent pulvinar, orci sit amet finibus semper, nibh risus laoreet augue, at blandit tellus nulla ut odio.

Vestibulum bibendum est a massa porta, vitae tempus enim malesuada. Pellentesque fringilla leo non vehicula pretium. Ut maximus ipsum at diam egestas, sit amet volutpat erat iaculis. Fusce dictum ipsum quam, sit amet hendrerit elit gravida a. Nam efficitur leo in mollis eleifend. Cras quis lorem pretium, condimentum libero sed, lacinia neque. Vestibulum tincidunt quam ut congue consectetur. Nullam congue varius bibendum. Maecenas consequat arcu quis magna rhoncus posuere. Cras vitae lectus ut lectus pharetra pulvinar varius vel justo.

Ut congue purus ac lorem scelerisque, id congue eros venenatis. Sed rutrum vitae odio vel malesuada. Aliquam vel nibh at ipsum sodales ultricies. Quisque facilisis neque sem, id accumsan leo gravida vel. Vestibulum eros libero, tempus ac arcu vel, tincidunt pulvinar magna. Aliquam dictum ornare magna sed iaculis. Integer vulputate metus at iaculis eleifend. Aenean vestibulum ut sapien id malesuada. Sed eu faucibus lectus, vitae gravida metus. Mauris et iaculis felis, vitae egestas metus. Integer semper, erat in gravida vehicula, justo neque suscipit est, porta dapibus est magna ac metus.`;

let backupDir: string;
let backupFile: string;
let testFilePath: string;

beforeAll(async () => {
    backupDir = resolve(process.cwd(), "./dist/test/");
    backupFile = resolve(backupDir, "./tmp1");
    await mkdir(backupDir, { recursive: true });

    testFilePath = resolve(process.cwd(), "./test/testFile.txt");
});

test("Basic read/write", async () => {
    const backupingStream = new BackupingStream(backupFile, { encoding: "ascii" });

    const readingFinished = new Promise(res => { backupingStream.on("readable", () => { res(backupingStream.read()); }); });

    backupingStream.write(testText);
    const result = await readingFinished;

    expect(result).toBe(testText);
});

test("Simple piped read/write", async () => {
    const provider = new PassThrough({ encoding: "ascii" });
    const consumer = new PassThrough({ encoding: "ascii" });
    const backupingStream = new BackupingStream(backupFile, { encoding: "ascii" });

    provider.pipe(backupingStream).pipe(consumer);

    const readPromise = new Promise(res => consumer.on("readable", () => {
        res(consumer.read());
    }));

    provider.write(testText);
    const consumerRead = await readPromise;

    expect(consumerRead).toBe(testText);
});

test("Write to backup", async () => {
    const backupingStream = new BackupingStream(backupFile, { highWaterMark: 0 });

    const source = createReadStream(testFilePath);
    const readLine = createInterface({ input: source });

    let lastLineWritten = new Promise<void>(res => { res(); });

    const inputFinished = new Promise<void>((res) => {
        readLine
            .on("close", res)
            .on("line", (input: string) => {
                lastLineWritten = new Promise(wrtieRes => {
                    backupingStream.write(input);
                    backupingStream.write(EOL, undefined, () => wrtieRes());
                });
            });
    });

    await inputFinished;
    await lastLineWritten;

    const [inputFile, backupingFile] = await Promise.all([open(testFilePath, "r"), open(backupingStream.backupFile, "r")]);
    const [inputBuff, outputBuff] = await Promise.all([inputFile.readFile(), backupingFile.readFile()]);

    const equals = inputBuff.equals(outputBuff);

    await Promise.all([inputFile.close(), backupingFile.close()]);
    expect(equals).toBeTruthy();
});

const waitForFileToReachSize = async (file: FileHandle, size: number, timeLimit = 200) => {

    let timeoutOccured = false;
    const timeout = setTimeout(() => { timeoutOccured = true; }, timeLimit);

    while (!timeoutOccured) {
        const stats = await file.stat();

        if (stats.size === size) break;
    }
    clearTimeout(timeout);
    return timeoutOccured;
};

test("Pipe to consumer from backup", async () => {
    const backupingStream = new BackupingStream(backupFile);

    const source = createReadStream(testFilePath);
    const readLine = createInterface({ input: source });

    let lastLineWritten = new Promise<void>(res => { res(); });

    const inputFinished = new Promise<void>((res) => {
        readLine
            .on("close", res)
            .on("line", (input: string) => {
                lastLineWritten = new Promise(wrtieRes => {
                    backupingStream.write(input);
                    backupingStream.write(EOL, undefined, () => wrtieRes());
                });
            });
    });

    await inputFinished;
    await lastLineWritten;

    const outputFilePath = resolve(backupDir, "./testBackupingStream_output.txt");
    const outputFile = await open(outputFilePath, "w+");
    const consumer = createWriteStream(outputFilePath, { flags: "w+" });

    backupingStream.pipe(consumer);

    const [inputFile, resultFile] = await Promise.all([open(testFilePath, "r"), open(outputFilePath, "r")]);

    const inputFileStat = await inputFile.stat();

    await waitForFileToReachSize(outputFile, inputFileStat.size);

    const [inputBuff, resultBuff] = await Promise.all([inputFile.readFile(), resultFile.readFile()]);

    const equals = inputBuff.equals(resultBuff);

    await Promise.all([inputFile.close(), outputFile.close(), resultFile.close()]);
    expect(equals).toBeTruthy();
});

test("Multiple disconnections of consumer", async () => {
    const outputPath = resolve(backupDir, "./testBackupingStream_long_output.txt");
    const [source, output] = await Promise.all([open(testFilePath, "r"), open(outputPath, "w+")]);
    const sourceSize = (await source.stat()).size;

    const provider = createReadStream(testFilePath, { highWaterMark: 100 });
    const backupingStream = new BackupingStream(backupFile, { writableHighWaterMark: 100, readableHighWaterMark: 200 });
    const consumer = createWriteStream(outputPath, { flags: "w+" });

    const providerEnd = new Promise(res => { provider.on("end", res); });

    let readLen = 0;
    let piped = true;
    let switchLenght = sourceSize / 5;

    provider.on("data", async (chunk) => {
        readLen += chunk.length;
        if (readLen > switchLenght) {
            // eslint-disable-next-line no-unused-expressions
            piped ? backupingStream.unpipe() : backupingStream.pipe(consumer);
            piped = !piped;
            switchLenght += sourceSize / 5;
        }
    }).pipe(backupingStream).pipe(consumer);

    await providerEnd;
    const timeout = await waitForFileToReachSize(output, sourceSize, 200);

    expect(timeout).toBeFalsy();

    const [sourceBuff, outputBuff] = await Promise.all([source.readFile(), output.readFile()]);

    expect(sourceBuff.length).toEqual(outputBuff.length);
    const equals = sourceBuff.equals(outputBuff);

    expect(equals).toBeTruthy();

    await Promise.all([source.close(), output.close()]);
});
