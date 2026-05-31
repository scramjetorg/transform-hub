module.exports = async function*(input) {
    for await (const item of input) {
        yield { echo: item, from: "input-sequence" };
    }
};
