module.exports = async function v2ClientCallsSequence(input) {
    const status = await this.hubClient().status.get();
    const hubs = await this.spaceClient().hubs.get();

    return input.map((item) => ({
        id: item.id,
        hubStatus: status.status,
        hubs: hubs.items.length
    }));
};
