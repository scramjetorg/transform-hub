const { stdout } = require("process");

const defer = (ts) => new Promise(res => setTimeout(res, ts));

// eslint-disable-next-line valid-jsdoc
/**
 * Simple Hubclient test
 *
 * @this {import("@scramjet/types").AppContext} this
 * @param {never} _stream
 * @returns {Proomise<void>}
 */
module.exports = async function(_stream) {
    if (!this.hub)
        throw new Error("Cannot run without hubClient");
    const hub = this.hub;

    await defer(10);

    const infiniteSequence = await hub.getSequence("infinite");

    if (infiniteSequence.instances.length === 0) {
        const infiniteClient = hub.getSequenceClient("infinite");
        const instance = await infiniteClient.start();

        const output = await instance.getStream("output");
        const log = await instance.getStream("log");

        log.pipe(stdout);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            let bytes = output.read(16384);

            if (bytes === null) {
                await new Promise(res => output.on("readable", res));
                bytes = output.read(16384);
            }
            this.logger.info("Read 16kB");

            await defer(10000);
        }
    }
};
