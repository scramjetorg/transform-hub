import { HostClient } from "@scramjet/api-client/";
import { createReadStream } from "fs";
import { resolve } from "path";

const host = new HostClient("http://localhost:8000/api/v1");

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const pkg = createReadStream(resolve(__dirname, "../../sth/packages/reference-apps/stdio-sequence.tar.gz"));

    const sequence = await host.sendSequence(pkg);
    const instance = await sequence.start({}, []);
    const instanceInfo = { id: instance.id, ...(await instance.getInfo()).data };

    // eslint-disable-next-line no-console
    console.error(instanceInfo);
})();
