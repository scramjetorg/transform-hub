import baseTest from "ava";
const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { CapabilityUnavailableError, setCapabilityDependencies } from "../src/lib/capabilities";
import { Readable } from "stream";
import { hubCommand } from "../src/lib/commands/hub";
import { instanceCommand } from "../src/lib/commands/instance";
import { sequenceCommand } from "../src/lib/commands/sequence";
import { spaceCommand } from "../src/lib/commands/space";

test.afterEach.always(() => setCapabilityDependencies());

const commands = [
    ["space", spaceCommand],
    ["hub", hubCommand],
    ["sequence", sequenceCommand],
    ["instance", instanceCommand]
] as const;

test.serial("config-control placeholders are registered and always exit as unavailable", async t => {
    allowAvaMemoryGrowth(t, { threshold: 1572864, reason: "Descriptor and RestAPI2 manifest resolution retain the four command trees while each unavailable leaf is exercised." });
    for (const [resource, command] of commands) {
        for (const [operation, args] of [["get", []], ["set", ["{}"]], ["reload", []]] as const) {
            if (resource === "hub" && operation === "get") continue;
            for (const profile of [undefined, { invalid: true }]) {
                setCapabilityDependencies({ getProfile: () => profile });
                const error = await t.throwsAsync(
                    () => executeCommand(parseCommandContext(resolveCommandPath(["config", operation, ...args], command))),
                    { instanceOf: CapabilityUnavailableError }
                );
                t.is((error as CapabilityUnavailableError).exitCode, 80, `${resource} config ${operation}`);
                t.regex(error!.message, new RegExp(`${resource} config ${operation}`));
            }
        }
    }
});

test.serial("hub config get uses the bound native v2 route", async t => {
    const requests: any[] = [];
    setCapabilityDependencies({
        getProfile: () => ({ endpoint: "https://broker.test", brokerId: "test", timeoutMs: 50, ingress: { level: "hub", expectedId: "hub", routeDomain: "route" }, tls: { caFile: "/tmp/ca", certFile: "/tmp/cert", keyFile: "/tmp/key" } }),
        createTransport: () => ({
            waitForRoute: async () => {}, close: async () => {},
            request: async (request: any) => {
                requests.push(request);
                const body = request.path === "/api/v2/ingress/identity"
                    ? JSON.stringify({ level: "hub", serviceId: "hub", routeDomain: "route" })
                    : JSON.stringify({ config: { exposed: true } });
                return { status: 200, body: Readable.from([body]), cleanup: async () => {} };
            }
        } as any)
    });

    await executeCommand(parseCommandContext(resolveCommandPath(["config", "get"], hubCommand)));
    t.deepEqual(requests.map(request => [request.method, request.path]), [["GET", "/api/v2/ingress/identity"], ["GET", "/api/v2/config"]]);
});
