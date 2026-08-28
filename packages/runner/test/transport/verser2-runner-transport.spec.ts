import test from "ava";

import {
    createRunnerVerser2GuestOptions
} from "../../src/transport/verser2-runner-transport";

const INSTANCE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function config() {
    return {
        kind: "verser2" as const,
        hostUrl: "http://verser2.local",
        routeDomain: `runner.${INSTANCE_ID}.scramjet.internal`,
        guestId: `runner.${INSTANCE_ID}.guest`,
        hubBrokerId: `runner.${INSTANCE_ID}.hub.broker`,
        minWaitingStreams: 2,
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/tmp/ca.pem" }
    };
}

test("maps runner configuration to a guest contract without opening a listener", t => {
    t.deepEqual(createRunnerVerser2GuestOptions(config()), {
        hostUrl: "http://verser2.local",
        guestId: `runner.${INSTANCE_ID}.guest`,
        routedDomains: [`runner.${INSTANCE_ID}.scramjet.internal`],
        minWaitingStreams: 2,
        leaseAcquireTimeoutMs: 1234,
        tls: { caFile: "/tmp/ca.pem" }
    });
});

test("preserves an explicit runner route domain when the guest ID differs", t => {
    const explicitConfig = {
        ...config(),
        guestId: "custom.runner.guest",
        routeDomain: "runner.explicit.scramjet.internal"
    };
    const options = createRunnerVerser2GuestOptions(explicitConfig);

    t.is(options.guestId, "custom.runner.guest");
    t.deepEqual(options.routedDomains, ["runner.explicit.scramjet.internal"]);
});
