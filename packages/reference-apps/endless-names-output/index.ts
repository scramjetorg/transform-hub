/* eslint-disable no-console */
import { ReadableApp, SynchronousStreamable } from "@scramjet/types";
import { PassThrough } from "stream";

const names = ["Alice", "Ada", "Aga", "Michał", "Patryk", "Rafał", "Aida", "Basia", "Natalia", "Monika", "Wojtek", "Arek"];

/**
 * Mutli output application.
 *
 * @param _stream - dummy input stream
 * @param max - how many items to print
 */

export = async function(_stream, max = 10) {
    const ps = new PassThrough();

    let cnt = 0;

    const interval = setInterval(async () => {
        // output
        const outputString = JSON.stringify({ name: names[cnt % names.length] }) + "\n";

        console.log(outputString);
        ps.write(outputString);

        cnt++;

        if (max && cnt > max) {
            clearInterval(interval);
            ps.end();
        }
    }, 500);

    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).topic = "names";
    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).contentType = "application/x-ndjson";

    return ps;
} as ReadableApp<any>;
