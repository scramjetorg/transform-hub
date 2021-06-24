import { HostClient } from "@scramjet/api-client/";
import { createReadStream } from "fs";
const host = new HostClient("http://localhost:8000/api/v1");

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const pkg = createReadStream("./packages/reference-apps/ports-sequence.tar.gz");
    const sequence = await host.sendSequence(pkg);

    console.log((await sequence.getInfo()).data);

    const instance = await sequence.start({}, ["/package/data.json"]);
    const instanceInfo = (await instance.getInfo()).data;

    console.log(instanceInfo);
})();
