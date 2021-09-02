import { ReadableApp, SynchronousStreamable } from "@scramjet/types";
import { PassThrough } from "stream";

const names = ["Alice", "Ada", "Aga", "Michał", "Patryk", "Rafał", "Aida", "Basia", "Natalia", "Monika", "Wojtek", "Arek"];

/**
 * Mutli output application.
 *
 * @param _stream - dummy input stream
 */
export = async function(_stream) {
    const ps = new PassThrough();

    let cnt = 0;

    setInterval(async () => {
        // output
        const outputString = `{ "name": "${names[cnt % names.length]}" }\n`;

        ps.write(outputString);
        console.log(outputString);
        cnt++;
    }, 500);

    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).topic = "names";
    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).contentType = "application/x-ndjson";

    return ps;
} as ReadableApp<any>;
