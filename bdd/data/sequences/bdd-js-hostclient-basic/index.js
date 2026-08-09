"use strict";

const { PassThrough } = require("stream");

module.exports = async function (_input) {
    this.logger.info("Working...");
    const out = new PassThrough();

    try {
        const getVersion = await this.hub.getVersion();
        console.log(getVersion);
        this.logger.info("Host version called from Sequence:", getVersion);

        const getLoadCheck = await this.hub.getLoadCheck();
        console.log(getLoadCheck);
        this.logger.info("Load check called from Sequence:", getLoadCheck);

        const getConfig = await this.hub.getConfig();
        console.log(getConfig);
        this.logger.info("Host config called from Sequence:", getConfig);

        const getStatus = await this.hub.getStatus();
        console.log(getStatus);
        this.logger.info("Host status called from Sequence:", getStatus);

        const seqList = await this.hub.listSequences();
        out.write(seqList.length.toString() + "\n");
        this.logger.info("Sequence list called from Sequence:", seqList);

        const instList = await this.hub.listInstances();
        out.write(instList.length.toString() + "\n");
        this.logger.info("Instance list called from Sequence:", instList);
        out.end();
    } catch (error) {
        console.error(error);
    }

    return out;
};
