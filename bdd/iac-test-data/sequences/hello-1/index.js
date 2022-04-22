module.exports = async function*(/** @type {import("stream").Readable} */ stream) {
    const prefix = this.config?.greet ? "Hello" : "Goodbye";

    for await (const data of stream) {
        yield `${prefix} ${data}?`;
    }
};
