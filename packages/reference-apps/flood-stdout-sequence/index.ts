import { InertApp } from "@scramjet/types";
const scramjet = require("scramjet");
const fs = require("fs");

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param {Readable} _stream - dummy input stream
 * @param {string} ffrom - dummy input stream
 */
module.exports = async function(_stream: any, ffrom = `${__dirname}/numbers.txt`) {

    this.on("test-event", () =>
        this.emit("test-event-response", "message from sequence")
    );

    /** 
     * TO BE REPLACED:
     * Writing to stream will be done with generator and on pause event will be caught.
    */
    return fs.createReadStream(ffrom)
        .on("end", () => {
            this.logger.info("File read by Sequence ended.");
        })
        .pipe(new scramjet.StringStream())
        .do((line: string) => {
            process.stdout.write(line + "\n");
        });

} as InertApp;
