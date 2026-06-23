import test from "ava";

import { getManagerGuestMinWaitingStreams } from "../src/lib/cpm-connector-leases";

test("getManagerGuestMinWaitingStreams leaves room for Manager control streams and API requests", t => {
    t.is(getManagerGuestMinWaitingStreams(1), 4);
    t.is(getManagerGuestMinWaitingStreams(4), 4);
    t.is(getManagerGuestMinWaitingStreams(8), 8);
});
