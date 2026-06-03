module.exports = async function appcontextSequence(input) {
    return input.map((item) => ({
        id: item.id,
        value: item.value * this.config.multiplier,
        instanceId: this.instanceId
    }));
};
