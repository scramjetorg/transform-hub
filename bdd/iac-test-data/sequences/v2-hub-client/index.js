const defer = (ts) => new Promise(res => setTimeout(res, ts));

/**
 * Canonical v2 Hub/Space client smoke sequence.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext} this
 */
module.exports = async function() {
    const status = await this.hubClient().status.get();

    if (!status.body) {
        throw new Error("Cannot run without v2 hub client");
    }

    while (true) {
        this.logger.info("v2 hub client smoke alive");
        await defer(10000);
    }
};
