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
        this.logger.log(cnt);

        if (cnt === 0) {
            cnt = 60;

            // stderr
            console.error("Error stream test", cnt);
        }

        cnt--;
    }, 1000);

    setInterval(async () => {
        // output
        const outputString = `{ "name": "${names[~~(Math.random() * (names.length - 1))]}" }\n`;

        ps.write(outputString);
        console.log(outputString);
    }, 500);

    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).topic = "abc";
    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).contentType = "text/plain";

    return ps;
} as ReadableApp<any>;
