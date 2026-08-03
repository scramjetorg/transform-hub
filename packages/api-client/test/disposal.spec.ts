import test from "ava";
import { HostClient } from "../src/host-client";
import { ManagerClient } from "../src/manager-client";

function transport(counter: { value: number }) {
    return { dispose: () => counter.value++ } as any;
}

test("HostClient disposes owned v1 and v2 transports", t => {
    const v1 = { value: 0 };
    const v2 = { value: 0 };
    const client = new HostClient("http://localhost/api/v1", transport(v1), transport(v2));
    client.dispose();
    client.dispose();
    t.is(v1.value, 1);
    t.is(v2.value, 1);
});

test("ManagerClient disposes v1, v2, and created child host transports", t => {
    const v1 = { value: 0 };
    const v2 = { value: 0 };
    const child = { value: 0 };
    const manager = new ManagerClient("http://localhost/api/v1", transport(v1), () => transport(child), transport(v2));
    manager.getHostClient("host");
    manager.dispose();
    manager.dispose();
    t.is(v1.value, 1);
    t.is(v2.value, 1);
    t.is(child.value, 1);
});
