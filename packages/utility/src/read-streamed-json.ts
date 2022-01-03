import { Readable } from "stream";
import { StringDecoder } from "string_decoder";

/**
 * Reads and parses JSON from a stream.
 *
 * @param {Readable} readable Stream to read from.
 * @returns {Promise<any>} Promise that resolves with the parsed JSON.
 */
export async function readStreamedJSON(readable: Readable): Promise<unknown> {
    const decoder = new StringDecoder("utf-8");

    let out = "";

    for await (const chunk of readable) {
        out += decoder.write(chunk);
    }

    out += decoder.end();

    return JSON.parse(out);
}
