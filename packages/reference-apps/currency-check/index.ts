import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";
import * as https from "https";
import { StringDecoder } from "string_decoder";

let API_KEY: string;

const getData = async (pair: string) => {
    return new Promise<any>(resolve => {
        https.get(`https://free.currconv.com/api/v7/convert?q=${pair}&compact=ultra&apiKey=${API_KEY}`, async (res) => {
            const decoder = new StringDecoder();

            for await (const d of res) {
                decoder.write(d);
            }

            resolve(decoder.end());
        });
    });
};

/**
 * Mutli output application.
 *
 * @param _stream - dummy input stream
 */
export = async function(_stream, ...args) {
    const ps = new PassThrough();
    const currencyPair = [args[1], args[2]].join("_");

    API_KEY = args[0];

    let cnt = 0;

    setInterval(async () => {
        this.logger.log(cnt);

        if (cnt === 0) {
            ps.write(await getData(currencyPair));
            cnt = 60;
        }

        cnt--;
    }, 1000);

    return ps;
} as ReadableApp<any>;
