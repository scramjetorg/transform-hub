module.exports = async function nativeTemplateBun(input) {
    const values = [];
    for await (const value of input) {
        values.push(value);
    }

    return `native-template-bun: ${values.join(" ")}`;
};
