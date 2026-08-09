import test from "ava";
import { adapterConfigDecoder } from "../src/kubernetes-config-decoder";

test("adapterConfigDecoder accepts bun runner image", t => {
    const decoded = adapterConfigDecoder.decode({
        namespace: "default",
        sthPodHost: "127.0.0.1",
        runnerImages: {
            node: "runner-node",
            python3: "runner-py",
            bun: "runner-bun",
        },
        sequencesRoot: "/tmp/sequences",
    });

    t.true(decoded.isOk());
});
