import { ReadableApp, SynchronousStreamable } from "@scramjet/types";
import { resolve } from "path";
import { PassThrough } from "stream";
import { createReadStream } from "fs";

export = async function(_stream) {
    console.log("Avengers sequence started");

    const ps = new PassThrough();
    const readFile = createReadStream(resolve(__dirname, "avengers.json"));

    ps.write(readFile);

    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).topic = "avengers";
    // eslint-disable-next-line no-extra-parens
    (ps as SynchronousStreamable<any>).contentType = "application/x-ndjson";

    return ps;
} as ReadableApp<any>;

