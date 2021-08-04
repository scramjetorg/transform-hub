import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";
import fetch from "node-fetch";

const getData = async (baseCurrency: string, currency: string) =>
    fetch(`https://api.coinbase.com/v2/prices/${baseCurrency}-${currency}/spot`)
        .then(res => res.json());
/**
 * Requests external API every 1 second.
 * Writes crypto prices to output stream.
 *
 * @param _stream - dummy input stream
 * @param baseCurrency currency (default: 'BTC')
 * @param currency currency (default: 'USD')
 */
const app: ReadableApp<string> = async function(_stream, baseCurrency = "BTC", currency = "USD") {
    const outputStream = new PassThrough();

    setInterval(async () => {
        getData(baseCurrency, currency)
            .then(data => {
                outputStream.write(JSON.stringify(data) + "\r\n");
            })
            .catch(() => {
                outputStream.write(JSON.stringify({ error: true }) + "\r\n");
            });
    }, 1000);

    return outputStream;
};

export default app;

