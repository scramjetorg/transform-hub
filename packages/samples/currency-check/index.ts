import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";
import * as https from "https";

const getData = async (pair: string) => {
    return new Promise<string>((resolve, reject) => {
        https.get(`https://api.coinbase.com/v2/prices/${pair}/spot`, async (res) => {
            const chunks: Buffer[] = [];

            res
                .on("data", (d) => chunks.push(d))
                .on("end", () => resolve(chunks.join("")))
                .on("error", reject);
        });
    });
};

/**
 * Requests external API every 1 second.
 * Writes unprocessed data to output stream.
 *0
 * @param _stream - dummy input stream
 * @param baseCurrency currency
 * @param currency currency
 */
export = async function(_stream, baseCurrency, currency) {
    const outputStream = new PassThrough();
    const currencyPair = [baseCurrency, currency].join("-");

    setInterval(async () => {
        getData(currencyPair)
            .then(data => {
                outputStream.write(data + "\r\n");
            })
            .catch(() => {
                outputStream.write(JSON.stringify({ error: true }) + "\r\n");
            });
    }, 1000);

    return outputStream;
} as ReadableApp<any>;
