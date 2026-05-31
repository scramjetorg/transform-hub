module.exports = async function*() {
    for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 400));
        yield { n: i, from: "output-sequence" };
    }
};
