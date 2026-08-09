import test from "ava";
import http from "http";
import { ClientUtils } from "../src";

test("ClientUtils reuses one keep-alive socket for sequential requests", async t => {
    let connections = 0;
    const server = http.createServer((_request, response) => {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ ok: true }));
    });
    server.on("connection", () => connections++);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const client = new ClientUtils(`http://127.0.0.1:${(address as any).port}`);

    try {
        await client.get("status");
        await client.get("status");
        t.is(connections, 1);
        t.true(Object.values((client as any).agent.freeSockets).some((items: any) => items.length > 0));
    } finally {
        client.dispose();
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
});

test("ClientUtils dispose destroys owned HTTP and HTTPS agents", t => {
    const client = new ClientUtils("http://127.0.0.1:1");
    const httpAgent = (client as any).agent;
    const httpsAgent = (client as any).fetch.httpsAgent;
    let httpDestroyed = 0;
    let httpsDestroyed = 0;
    const httpDestroy = httpAgent.destroy.bind(httpAgent);
    const httpsDestroy = httpsAgent.destroy.bind(httpsAgent);
    httpAgent.destroy = () => { httpDestroyed++; return httpDestroy(); };
    httpsAgent.destroy = () => { httpsDestroyed++; return httpsDestroy(); };

    client.dispose();
    client.dispose();

    t.is(httpDestroyed, 1);
    t.is(httpsDestroyed, 1);
    t.deepEqual(httpAgent.freeSockets, {});
    t.deepEqual(httpsAgent.freeSockets, {});
});

test("borrowed custom agents survive shared-client disposal and owner destroys once", t => {
    const agent = new http.Agent({ keepAlive: true });
    let destroys = 0;
    const destroy = agent.destroy.bind(agent);
    agent.destroy = () => { destroys++; return destroy(); };
    const borrowedA = new (require("../src").ClientUtilsCustomAgent)("http://127.0.0.1:1", agent);
    const borrowedB = new (require("../src").ClientUtilsCustomAgent)("http://127.0.0.1:1", agent);
    const owner = new (require("../src").ClientUtilsCustomAgent)("http://127.0.0.1:1", agent, true);

    borrowedA.dispose();
    borrowedB.dispose();
    t.is(destroys, 0);
    owner.dispose();
    owner.dispose();
    t.is(destroys, 1);
});
