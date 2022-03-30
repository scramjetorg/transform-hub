import { ReadableApp, SynchronousStreamable } from "@scramjet/types";
import { PassThrough } from "stream";

export = async function(_stream) {
    this.logger.trace("Avengers sequence started");

    const ps = new PassThrough({ objectMode: true }) as PassThrough & SynchronousStreamable<any>;

    ps.write({ name: "Hulk" });
    ps.end();

    ps.topic = "avengers";
    ps.contentType = "application/x-ndjson";

    return ps;
} as ReadableApp<any>;

