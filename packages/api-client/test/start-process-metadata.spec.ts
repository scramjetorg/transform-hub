import test from "ava";
import { SequenceClient } from "../src/sequence-client";

test("SequenceClient retains process PID start metadata on InstanceClient", async t => {
    const sequence = SequenceClient.from("sequence", {
        client: {
            post: async () => ({ id: "instance", processId: 4321 })
        }
    } as any);

    const instance = await sequence.start({} as any);

    t.is(instance.id, "instance");
    t.is(instance.processId, 4321);
});
