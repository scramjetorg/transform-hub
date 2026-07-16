"use strict";

const { PassThrough } = require("stream");

module.exports = async function () {
    this.logger.trace("Avengers sequence started");
    const output = new PassThrough({ objectMode: true });

    output.write({ name: "Hulk" });
    output.end();
    output.topic = "avengers";
    output.contentType = "application/x-ndjson";
    return output;
};
