/* eslint-disable no-console */
const { PassThrough } = require("stream");
const fs = require("fs");

module.exports = async function(_input) {
    this.logger.info("Working...");
    const out = new PassThrough();
    const readStream = fs.createReadStream("bdd/data/data.json");

    try {
        await this.runner.hub.sendNamedData(
            topic,
            readStream,
            {},
            "application/x-ndjson",
            true
        );
    } catch (e) {
        // if error occurs it will be logged under /instance/:id/stderr endpoint (CLI: si inst stderr <instID>)
        console.error(e);
    }

    out.write("Data");

    return out;
};
