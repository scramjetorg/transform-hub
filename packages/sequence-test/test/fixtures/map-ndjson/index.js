module.exports = async function mapNdjson(input) {
    return input.map((item) => ({ id: item.id, value: item.value * 2 }));
};
