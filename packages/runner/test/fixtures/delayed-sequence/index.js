module.exports = async function*() {
    await new Promise(r => setTimeout(r, 2000));
    return;
};
