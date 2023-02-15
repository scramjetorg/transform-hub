"use strict";

import { PassThrough } from "stream";

const createRotatingWriteStream = (...args: any[]) => { return null as any }
const createRotatingReadStream = createRotatingWriteStream;
const startWriting = createRotatingWriteStream;
const stopWriting = createRotatingWriteStream;

const tsDb: Map<number,string> & { findClose: any } = Object.assign(new Map(), { findClose: null as any });

module.exports = {
    consume(input, { chunkSize = 10e6 }) {
        const output = new PassThrough();

        input
            .pipe(createRotatingWriteStream("/srv/volume/", chunkSize)
                    .on("rotate", (file) => {
                        tsDb.set(Date.now(), file.name);
                        output.write(file.contents);
                    }));

        output.on("pause", startWriting);
        output.on("resume", stopWriting);
        input.on("end", () => output.end());

        return output;
    },
    produce(input, headers: {[text: string]: string}) {
        if (!("range" in headers)) return input;

        const fileToStartWith = tsDb.findClose(+headers.range);
        const output = createRotatingReadStream("/srv/volume/", fileToStartWith, input);

        output.on("no-more-files", () => output.end());

        return output;
    }
}
