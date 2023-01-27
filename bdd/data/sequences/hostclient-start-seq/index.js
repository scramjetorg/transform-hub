/* eslint-disable no-console */
const { PassThrough } = require("stream");

/**
 * Sequence that starts any other Sequence, by giving its id as an argument.
 * @param {*} _input - dummy input
 * @param {*} sequenceId - Sequence id that will be started
 * @returns output stream with Instance id
 */

module.exports = async function(_input, sequenceId) {
    this.logger.info("Working...");
    const out = new PassThrough();

    try {
        const seqClient = await this.hub.getSequenceClient(sequenceId);

        this.logger.info("Sequence client called:", seqClient);
        const seqStart = await seqClient.start(sequenceId);
        const seqStartStr = JSON.stringify(seqStart);

        this.logger.info(`Sequence ${sequenceId} started: ${seqStartStr}`);
        out.write(seqStart._id);
    } catch (e) {
        // if error occurs it will be logged under /instance/:id/stderr endpoint (CLI: si inst stderr <instID>)
        console.error(e);
    }
    return out;
};
