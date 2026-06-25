"use strict";

/**
 * BDD AppContext fixture: v2 hubClient and spaceClient.
 * Spec: calls hubClient().status.get() and spaceClient().hubs.get().
 * Asserts status 200 and valid response bodies before writing the
 * stdout marker. If the runtime cannot serve these endpoints the fixture
 * throws instead of emitting a false-positive marker.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function appcontextV2ClientsSequence(input) {
    const statusResp = await this.hubClient().status.get();

    if (statusResp.status !== 200) {
        throw new Error(
            "hubClient().status.get() returned status " + statusResp.status
        );
    }
    if (statusResp.body?.status !== "ok") {
        throw new Error(
            'hubClient().status.get() body.status is not "ok": ' +
                JSON.stringify(statusResp.body)
        );
    }

    const hubsResp = await this.spaceClient().hubs.get();

    if (hubsResp.status !== 200) {
        throw new Error(
            "spaceClient().hubs.get() returned status " + hubsResp.status
        );
    }
    if (!Array.isArray(hubsResp.body?.items)) {
        throw new Error(
            "spaceClient().hubs.get() body.items is not an array: " +
                JSON.stringify(hubsResp.body)
        );
    }

    process.stdout.write(
        JSON.stringify({
            type: "appcontext-v2-clients",
            hubStatus: statusResp.body?.status,
            spaceItems: hubsResp.body?.items?.length ?? 0,
            timestamp: Date.now(),
        }) + "\n"
    );

    return { v2ClientsHandled: true };
};
