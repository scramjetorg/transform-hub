
module.exports = async function*(/** @type {import("stream").Readable} */ stream, prefix = "Hello") {
    for await (const data of stream) {
        yield `${prefix} ${data}?`;
    }
};
