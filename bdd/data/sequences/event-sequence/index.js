
/**
 * Simple test event sequence.
 *
 * @param {never} _input - unused
 * @param {string} inputEvent - input
 * @param {string} outputEvent - output
 * @returns {void}
 * @this {import("@scramjet/sequence-types").SequenceAppContext<{}, {}>} - context
 */
module.exports = async function(_input, inputEvent = "in", outputEvent = "out") {
    this.logger.info("started");
    return new Promise((res) => {
        this.on(inputEvent, async (msg) => {
            const ev = JSON.parse(msg);

            console.log("event", JSON.stringify(ev));
            this.emit(outputEvent, JSON.stringify({ test: ev.test + 1 }));

            res();
        });
    });
};
