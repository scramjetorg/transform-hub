import { Readable } from "stream";

export function streamToString(): (value: Readable, index: number, array: Readable[]) => Promise<string> {
    return async (stream) => {
        let data = "";

        for await (const item of stream) {
            data = `${data}${item}`;
        }
        return data;
    };
}
