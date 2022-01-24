/* eslint-disable no-console */
import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";

/**
 * Mutli output application.
 *
 * @param _stream - dummy input stream
 */
export = async function(_stream) {
    const ps = new PassThrough();

    let cnt = 0;
    let cnt2 = 0;

    setInterval(async () => {
        // stdout
        console.log(cnt);

        // log
        this.logger.trace("Count", cnt);

        if (cnt === 0) {
            cnt = 60;

            // stderr
            console.error("Error stream test", cnt);
        }

        cnt--;
    }, 1000);

    setInterval(async () => {
        // output
        ps.write(cnt2 + "\n");
        cnt2++;
    }, 500);

    return ps;
} as ReadableApp<any>;
