"use strict";

/**
 * BDD AppContext fixture: v2 hubClient and spaceClient.
 *
 * Uses this.hubClient() and this.spaceClient() to make canonical
 * v2 API calls, then reports results.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextV2ClientsSequence(input) {
    const results = [];

    try {
        const statusResp = await this.hubClient().status.get();
        results.push({
            client: "hubClient",
            method: "status.get",
            status: "ok",
            body: statusResp.body,
        });
    } catch (err) {
        results.push({
            client: "hubClient",
            method: "status.get",
            status: "error",
            error: String(err),
        });
    }

    try {
        const hubsResp = await this.spaceClient().hubs.get();
        results.push({
            client: "spaceClient",
            method: "hubs.get",
            status: "ok",
            items: hubsResp.body.items ? hubsResp.body.items.length : 0,
        });
    } catch (err) {
        results.push({
            client: "spaceClient",
            method: "hubs.get",
            status: "error",
            error: String(err),
        });
    }

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-v2-clients",
            results,
            timestamp: Date.now(),
        }) + "\n"
    );

    return { v2Clients: results.length, handled: true };
};
