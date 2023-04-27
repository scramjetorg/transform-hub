const { EventEmitter } = require("events");

/**
 * Simple data generator with rate controls
 *
 * @param {never} _input input ignored
 * @param {number} chunkSize size of a single chunk (3 megs by default)
 * @param {number} chunkFrequency rate in Hz (1 Hz)
 */
module.exports = async function* (_input, chunkSize = 3 << 20, chunkFrequency = 1) {
    const ee = new EventEmitter();
    let i = 0;
    let end = false;

    setInterval(() => ee.emit("tick", i++), 1000 / chunkFrequency);
    this.on("stop", () => { end = true; });

    let n = 0;

    while (!end) {
        const chunkPayload = `${Date.now()}|${n++}`;
        const chunk = `${chunkPayload}${" ".repeat(chunkSize - chunkPayload.length)}`;

        yield chunk;

        if (n >= i) {
            await new Promise(res => ee.once("tick", res));
        }
    }
};
