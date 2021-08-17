/* eslint-disable padding-line-between-statements */
import { HostClient } from "@scramjet/api-client/";
import { createReadStream } from "fs";
import { resolve } from "path";

const sth = "fake_host_id";

const host = new HostClient("http://localhost:9000/api/v1/sth/" + sth);
//const host = new HostClient("http://localhost:8000/api/v1");

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const pkg = createReadStream(resolve(__dirname, "../../packages/reference-apps/multi-outputs.tar.gz"));

    //console.log((await host.getLoadCheck()).data);

    const sequence = await host.sendSequence(pkg);
    const instance = await sequence.start({}, []);
    const instanceInfo = { id: instance.id, ...(await instance.getInfo()).data };

    // eslint-disable-next-line no-console
    console.error(instanceInfo);
})();
