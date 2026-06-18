module.exports = async function*(stream) {
    for await (const data of stream) {
        yield `Hi ${data}?`;
    }
};
