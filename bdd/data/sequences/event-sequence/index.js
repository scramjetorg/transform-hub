/* eslint-disable no-console */

// eslint-disable-next-line valid-jsdoc
/**
 * Simple test event sequence.
 *
 * @param {never} _input - unused
 * @param {string} inputEvent - input
 * @param {string} outputEvent - output
 * @returns {void}
 * @this {import("@scramjet/types").AppContext<{}, {}>} - context
 */
module.exports = async function(_input, inputEvent = "in", outputEvent = "out") {
    this.logger.info("started");
    return new Promise((res) => {
        this.on(inputEvent, async (msg) => {
            const ev = JSON.parse(msg);

            console.log("event", JSON.stringify(ev));
            this.emit(outputEvent, JSON.stringify({ test: ev.test + 1 }));

            await new Promise(res2 => setTimeout(res2, 100));

            res();
        });
    });
};

