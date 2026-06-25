module.exports = function(stream) {
    const output = (async function*() {
        for await (const data of stream) {
            yield `Hello ${data}?`;
        }
    })();

    output.contentType = "text/plain";

    return output;
};
