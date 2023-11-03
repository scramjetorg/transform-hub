import test from "ava";
import * as http from "http";
import * as https from "https";
import { createServer } from "@scramjet/api-server";
import { Verser, VerserClient, VerserConnection } from "../src";
import path from "path";
import { readFileSync } from "fs";
import { APIExpose } from "@scramjet/types";
import { spawnSync } from "child_process";

async function connectVerserClientAToVerserB(
    apiB: APIExpose,
    verserClientA: VerserClient,
): Promise<VerserConnection> {
    const verserB = new Verser(apiB.server);

    const connectionResolver = { res: (_conn: VerserConnection) => {} };
    const connectionPromised = new Promise<VerserConnection>(res => { connectionResolver.res = res; });

    verserB.on("connect", (verserConnection) => {
        verserConnection.respond(200);
        // @TODO we have to do that, which means that verser api is a bit off
        verserConnection.reconnect();
        connectionResolver.res(verserConnection);
    });

    await verserClientA.connect();

    return connectionPromised;
}

function getJSONResponseFromRequest(request: http.ClientRequest): Promise<any> {
    return new Promise<any>(resolve => {
        request.on("response", async (response) => {
            let responseBody = "";

            for await (const chunk of response) {
                responseBody += chunk;
            }

            resolve(JSON.parse(responseBody));
        });
    });
}

test("Connect VerserClient A to Verser B and send HTTP GET Request to VerserClient A", async (t) => {
    const SERVER_B_PORT = 1999;
    const apiB = createServer({ });

    apiB.server.listen(SERVER_B_PORT);

    const apiA = createServer();

    // @TODO since this is alway needed, maybe we should be setting that in VerserClient?
    (apiA.server as http.Server & { httpAllowHalfOpen?: boolean }).httpAllowHalfOpen = true;

    const verserClientA = new VerserClient({
        headers: { city: "Valencia" },
        verserUrl: `http://0.0.0.0:${SERVER_B_PORT}`,
        server: apiA.server
    });

    const verserConnectionB = await connectVerserClientAToVerserB(apiB, verserClientA);

    t.is(verserConnectionB.getHeaders().city, "Valencia");

    // Forward any request to B to A
    apiB.use("*", (req, res) => verserConnectionB.forward(req, res));

    apiA.get("*", () => ({ greeting: "Bye" }));

    // Make request to B that should be forwarded to A
    const requestToAThroughB = http.request({
        port: SERVER_B_PORT,
        method: "GET",
    });

    requestToAThroughB.end();

    const responseFromAToB = await getJSONResponseFromRequest(requestToAThroughB);

    // Verify that response from A got back
    t.deepEqual(responseFromAToB, { greeting: "Bye" });
});

test("Connect VerserClient A to Verser B over SSL and send HTTPS GET Request to VerserClient A", async (t) => {
    const certDir = path.join(__dirname, "cert");

    spawnSync("./gen-localhost-cert.sh", { cwd: certDir });

    const SERVER_B_PORT = 2000;
    const apiB = createServer({
        sslKeyPath: path.join(certDir, "localhost.key"),
        sslCertPath: path.join(certDir, "localhost.crt"),
    });

    apiB.server.listen(SERVER_B_PORT);

    const apiA = createServer();

    (apiA.server as http.Server & { httpAllowHalfOpen?: boolean }).httpAllowHalfOpen = true;

    const verserClientA = new VerserClient({
        headers: { city: "Valencia" },
        verserUrl: `https://127.0.0.1:${SERVER_B_PORT}`,
        server: apiA.server,
        https: { ca: [readFileSync(path.join(certDir, "myCA.pem"))] }
    });

    const verserConnectionB = await connectVerserClientAToVerserB(apiB, verserClientA);

    t.is(verserConnectionB.getHeaders().city, "Valencia");

    // Forward any request to B to A
    apiB.use("*", (req, res) => verserConnectionB.forward(req, res));

    apiA.get("*", () => ({ greeting: "Bye" }));

    // Make request to B that should be forwarded to A
    const requestToAThroughB = https.request({
        port: SERVER_B_PORT,
        method: "GET",
        ca: [readFileSync(path.join(certDir, "myCA.pem"))]
    });

    requestToAThroughB.flushHeaders();

    const responseFromAToB = await getJSONResponseFromRequest(requestToAThroughB);

    // Verify that response from A got back
    t.deepEqual(responseFromAToB, { greeting: "Bye" });

    spawnSync("./cleanup-localhost-cert.sh", { cwd: certDir });
});

