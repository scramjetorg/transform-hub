import { TransformApp } from "@scramjet/types";
import { PassThrough } from "stream";
import { createHash } from "crypto";
import { createInterface } from "readline";
import { get } from "https";

const getFirstLineFromUrlFilePromise = async (url: string) => {
    return new Promise<string>((res, rej) => {
        get(url, (response) => {
            const rl = createInterface({ input: response });

            rl.on("line", (line) => {
                response.destroy();
                res(line);
            });
        }).on("error", rej);
    });
};

// Simple seqence receiving line of text and passing to the output:
// received line + md5 of line + first line of file from storeItemUrl
// seqeuence destroys outputStream if it's unable to get line from storeItemUrl
const app: TransformApp<string> = async function(input: any, development = "") {
    const outputStream = new PassThrough({ encoding: "utf-8" });

    if (development) input.on("data", (data: Buffer) => outputStream.write(`<><> ${new Date()}, ${data.toString("utf-8").match(/\n/g)?.length} <><>\n`)).pause();

    const rl = createInterface({ input });

    let drain: null | Promise<void> = null;

    const storeItemUrl = "https://assets.scramjet.org/scp-store/helloworld.txt";
    let storeFirstLine: string = "";

    rl.on("line", async (line) => {
        const out = outputStream.write(
            `${line};${createHash("md5").update(line).digest("hex")};${new Date()};${storeFirstLine}\n`
        );

        if (!out) {
            input.pause();
            drain = new Promise<void>((res, rej) => outputStream.on("drain", res).on("error", rej).on("close", rej));
            await drain;
            input.resume();
        }
    }).on("close", async () => {
        await drain;
        outputStream.end();
    });

    try {
        storeFirstLine = await getFirstLineFromUrlFilePromise(storeItemUrl);
    } catch (error: any) {
        outputStream.destroy(error);
        input.end();
    }

    return outputStream;
};

export default app;
