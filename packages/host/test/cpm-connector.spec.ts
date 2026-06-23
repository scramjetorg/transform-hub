import test from "ava";

import { getManagerGuestMinWaitingStreams } from "../src/lib/cpm-connector-leases";

test("getManagerGuestMinWaitingStreams leaves room for Manager control streams and API requests", t => {
    t.is(getManagerGuestMinWaitingStreams(1), 128);
    t.is(getManagerGuestMinWaitingStreams(4), 128);
    t.is(getManagerGuestMinWaitingStreams(256), 256);
    t.is(getManagerGuestMinWaitingStreams(1, 192), 192);
});
