import { Readable } from "stream";

export async function streamToString(stream: Readable): Promise<string> {
    let data = "";

    for await (const item of stream) {
        data = `${data}${item}`;
    }
    return data;
}
