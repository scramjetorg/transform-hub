module.exports = async function nativeTemplateNode(input) {
    const values = [];
    for await (const value of input) {
        values.push(value);
    }

    return `native-template-node: ${values.join(" ")}`;
};
