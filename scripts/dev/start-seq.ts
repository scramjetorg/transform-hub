import { HostClient } from "@scramjet/api-client/src/host-client";
import { readFileSync } from "fs";
const host = new HostClient("http://localhost:8000/api/v1");

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const sequence = await host.sendSequence(
        readFileSync("./packages/samples/hello-alice-out.tar.gz")
    );
    const instance = await sequence.start({}, ["/package/data.json"]);

    (await instance.getStream("stdout")).data.pipe(process.stdout);
})();
