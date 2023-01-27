/* eslint-disable no-console */
const { PassThrough } = require("stream");

/**
 * Sequence that uses some basic hostClient's methods, like:
 * - getVersion()
 * - getStatus()
 * - getLoadCheck()
 * - ...
 * @param {*} _input - dummy input, it takes no params
 *
 * @returns output stream with some data
 */

module.exports = async function(_input) {
    this.logger.info("Working...");
    const out = new PassThrough();

    try {
        // get version
        const getVersion = await this.hub.getVersion();

        console.log(getVersion);
        this.logger.info("Host version called from Sequence:", getVersion);

        // get load check
        const getLoadCheck = await this.hub.getLoadCheck();

        console.log(getLoadCheck);
        this.logger.info("Load check called from Sequence:", getLoadCheck);

        // get config
        const getConfig = await this.hub.getConfig();

        console.log(getConfig);
        this.logger.info("Host config called from Sequence:", getConfig);

        // get status
        const getStatus = await this.hub.getStatus();

        console.log(getStatus);
        this.logger.info("Host status called from Sequence:", getStatus);

        // List sequences and write its length to output
        const seqList = await this.hub.listSequences();

        out.write(seqList.length.toString() + "\n");
        this.logger.info("Sequence list called from Sequence:", seqList);

        // List instances and write its length to output
        const instList = await this.hub.listInstances();

        out.write(instList.length.toString() + "\n");
        this.logger.info("Instance list called from Sequence:", instList);
    } catch (e) {
        // if error occurs it will be logged under /instance/:id/stderr endpoint (CLI: si inst stderr <instID>)
        console.error(e);
    }
    return out;
};
