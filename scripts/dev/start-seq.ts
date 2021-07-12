/* eslint-disable padding-line-between-statements */
import { HostClient } from "@scramjet/api-client/";
import { createReadStream } from "fs";
import { resolve } from "path";
const host = new HostClient("http://localhost:8000/api/v1");

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {

    /*
    const pkg = createReadStream(resolve(__dirname, "../../packages/samples/hello-alice-out.tar.gz"));
    const sequence = await host.sendSequence(pkg);
    const instance = await sequence.start({}, ["/package/data.json"]);
    */
    const pkg = createReadStream(resolve(__dirname, "../../packages/samples/currency-check.tar.gz"));
    const sequence = await host.sendSequence(pkg);
    const instance = await sequence.start({}, ["BTC", "USD"]);
    const instanceInfo = (await instance.getInfo()).data;

    // eslint-disable-next-line no-console
    console.error(instanceInfo);
})();
