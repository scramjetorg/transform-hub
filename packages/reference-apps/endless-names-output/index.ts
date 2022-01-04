/* eslint-disable no-console */
import { HasTopicInformation, ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";

const names = ["Alice", "Ada", "Aga", "Michał", "Patryk", "Rafał", "Aida", "Basia", "Natalia", "Monika", "Wojtek", "Arek"];

/**
 * Mutli output application.
 *
 * @param _stream - dummy input stream
 * @param max - how many items to print
 */

export = async function(_stream, max = 10) {
    const ps: PassThrough & HasTopicInformation = new PassThrough({ objectMode: true });

    let cnt = 0;

    const interval = setInterval(async () => {
        // output
        const data = { name: names[cnt % names.length] };

        console.log(data);
        ps.write(data);

        cnt++;

        if (max && cnt > max) {
            clearInterval(interval);
            ps.end();
        }
    }, 500);

    ps.topic = "names";
    ps.contentType = "application/x-ndjson";

    return ps;
} as ReadableApp<any>;
