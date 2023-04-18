import { PassThrough } from "stream";
import BackupingStream from "../../src/lib/serviceDiscovery/backupingStream";
import { mkdir, opendir } from "fs/promises";
import { resolve } from "path";
import { Dir } from "fs";
// import { createInterface } from "readline";

const testText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis eget nisl viverra, efficitur eros quis, sodales eros. Suspendisse feugiat ac ipsum non aliquam. Quisque dapibus nisi libero. Fusce euismod lacus vitae eros suscipit semper in non dui. Sed quis porttitor elit. Nulla a sapien mi. Suspendisse tempus vitae lectus a lobortis. Phasellus et gravida purus, et porta mauris. Integer urna nulla, semper nec leo id, ultrices bibendum odio. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Aenean eu iaculis dui. Ut ac dolor aliquet, placerat sapien vitae, hendrerit purus.

Proin porta cursus erat, ut dignissim felis. Suspendisse potenti. Duis et aliquet odio. Aliquam congue blandit dolor non dapibus. Vivamus eros dolor, vulputate vitae arcu vel, pretium porttitor lorem. Vivamus eget quam quis arcu lacinia malesuada id a sem. Maecenas in ligula orci. Sed dapibus, urna vel malesuada dictum, lectus ex convallis ante, eget tempor lorem ante ac lectus. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Suspendisse enim ante, laoreet at urna vel, malesuada vestibulum nulla. Morbi orci metus, imperdiet in mattis a, tincidunt vitae tortor. Vivamus at consectetur mauris.

In eu nulla luctus, lacinia nulla sit amet, condimentum leo. Vivamus lectus ex, venenatis in nulla eu, congue rutrum sapien. Cras suscipit sed elit non blandit. Nullam volutpat facilisis elit at laoreet. Aliquam mattis quis sem eget rutrum. Duis sapien dui, tincidunt nec ipsum id, rutrum pulvinar purus. Maecenas ut euismod purus, vel porta lacus. Vestibulum sit amet nulla sit amet diam rhoncus pharetra nec at purus. Donec mattis diam sit amet nisi tincidunt accumsan. Donec a nunc sed tortor dictum finibus. In ultricies lectus non urna convallis mollis. Pellentesque aliquam metus ante, laoreet porttitor mauris sodales et. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nullam quis laoreet nisl. Praesent pulvinar, orci sit amet finibus semper, nibh risus laoreet augue, at blandit tellus nulla ut odio.

Vestibulum bibendum est a massa porta, vitae tempus enim malesuada. Pellentesque fringilla leo non vehicula pretium. Ut maximus ipsum at diam egestas, sit amet volutpat erat iaculis. Fusce dictum ipsum quam, sit amet hendrerit elit gravida a. Nam efficitur leo in mollis eleifend. Cras quis lorem pretium, condimentum libero sed, lacinia neque. Vestibulum tincidunt quam ut congue consectetur. Nullam congue varius bibendum. Maecenas consequat arcu quis magna rhoncus posuere. Cras vitae lectus ut lectus pharetra pulvinar varius vel justo.

Ut congue purus ac lorem scelerisque, id congue eros venenatis. Sed rutrum vitae odio vel malesuada. Aliquam vel nibh at ipsum sodales ultricies. Quisque facilisis neque sem, id accumsan leo gravida vel. Vestibulum eros libero, tempus ac arcu vel, tincidunt pulvinar magna. Aliquam dictum ornare magna sed iaculis. Integer vulputate metus at iaculis eleifend. Aenean vestibulum ut sapien id malesuada. Sed eu faucibus lectus, vitae gravida metus. Mauris et iaculis felis, vitae egestas metus. Integer semper, erat in gravida vehicula, justo neque suscipit est, porta dapibus est magna ac metus.`;

let backupDir: Dir;

beforeEach(async () => {
    const backupPath = resolve(process.cwd(), "./dist/test/");

    await mkdir(backupPath, { recursive: true });
    backupDir = await opendir(backupPath);
});

// describe("Persistent Stream", () => {
test("Basic read/write", async () => {
    let backupingStream: BackupingStream;

    const readingFinished = new Promise(res => {
        backupingStream = new BackupingStream(backupDir, { encoding: "ascii" })
            .on("readable", () => {                res(backupingStream.read());            });
    }
    );

    await new Promise<void>(res => {
        backupingStream.write(testText, () => {
            console.log("Write Callback");
            res();
        });
    });
    const result = await readingFinished;

    expect(result).toBe(testText);
});

test("Piped read/write", async () => {
    const provider = new PassThrough({ encoding: "ascii" });
    const consumer = new PassThrough({ encoding: "ascii" });
    const backupingStream = new BackupingStream(backupDir);

    provider.pipe(backupingStream).pipe(consumer);

    const readPromise = new Promise(res => consumer.on("readable", () => {
        res(consumer.read());
    }));

    provider.write(testText);
    const consumerRead = await readPromise;

    expect(consumerRead).toBe(testText);
});

test("Create backup when no consumers", async () => {
    const backupingStream = new BackupingStream(backupDir);

    backupingStream.write(testText);

    // const backupFile = backupingStream.backupFile;

    // expect(backupFile).toBeDefined();

    // console.log(backupPath);
    // const readPromise = new Promise(resolve => testConsumer.stream().on("readable", () => {
    //     resolve(testConsumer.stream().read());
    // }));

    // testProvider.stream().push(testText);
    // const readValue = await readPromise;

    // expect(readValue).toBe(testText);
});
// });
