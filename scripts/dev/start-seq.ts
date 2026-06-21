import { HostClient } from "@scramjet/api-client/";
import { createReadStream } from "fs";
import { resolve } from "path";

const host = new HostClient("http://localhost:8000/api/v1");

(async () => {
    const pkg = createReadStream(resolve(__dirname, "../../sth/packages/reference-apps/stdio-sequence.tar.gz"));

    const sequence = await host.sendSequence(pkg);
    const instance = await sequence.start({ appConfig: {} });
    const instanceInfo = { id: instance.id, ...await instance.getInfo() };

    console.error(instanceInfo);
})();
