/* eslint-disable no-console */
const { PassThrough } = require("stream");

/**
 * This Sequence is for test purposes only (Scenario: E2E-007 TC-002 Test Sequence that starts another Sequence).
 * To make its running sense, it requires a pre-launch action of sending another Sequence to the Hub.
 * Starting this Sequence with an empty Sequence list will result in an infinite loop
 * of starting this, very same Sequence.
 * @param {*} _input - dummy input, it takes no params
 * @returns output stream with Sequence id
 */

module.exports = async function(_input) {
    this.logger.info("Working...");
    const out = new PassThrough();
    const defer = (timeout) => new Promise(res => setTimeout(res, timeout));

    try {
        const seqList = await this.runner.hub.listSequences();

        await this.logger.info("Sequence list called from Sequence:", seqList);
        const sequenceId = await seqList[0].id;

        await this.logger.info("Sequence ID:", sequenceId);
        out.write(sequenceId);
        await defer(5000);
        await this.logger.info("after 5s wait");
        const seqClient = await this.runner.hub.getSequenceClient(sequenceId);

        this.logger.info("Sequence client called:", seqClient);
        await seqClient.start(sequenceId);
    } catch (e) {
        // if error occurs it will be logged under /instance/:id/stderr endpoint (CLI: si inst stderr <instID>)
        console.error(e);
    }
    return out;
};
