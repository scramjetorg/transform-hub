import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";
import * as https from "https";

const getData = async (pair: string) => {
    return new Promise<any>(resolve => {
        https.get(`https://api.coinbase.com/v2/prices/${pair}/spot`, async (res) => {
            const chunks: Buffer[] = [];

            res.on("data", (d) => chunks.push(d));
            res.on("end", () => resolve(chunks.join("")));
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
    const currencyPair = [args[0], args[1]].join("-");

    let cnt = 0;

    setInterval(async () => {
        this.logger.log(cnt);

        ps.write(await getData(currencyPair) + "\r\n");

        if (cnt === 0) {
            cnt = 60;
        }

        cnt--;
    }, 1000);

    return ps;
} as ReadableApp<any>;
