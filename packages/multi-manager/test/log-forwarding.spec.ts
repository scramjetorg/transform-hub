import test from "ava";
import { parseCliOptions } from "@scramjet/config";
import { MultiManager } from "../src/lib/multi-manager";
import { MultiManagerConfig, multiManagerCliOptions } from "../src/config/multi-manager-configuration";

test("MultiManager API-server log consumption defaults enabled and honors log.apiServers", t => {
    t.true(MultiManager.shouldConsumeApiServerLogs({} as any));
    t.true(MultiManager.shouldConsumeApiServerLogs({ log: { apiServers: true } }));
    t.false(MultiManager.shouldConsumeApiServerLogs({ log: { apiServers: false } }));
});

test("MultiManager executable option reaches its config and consumer", t => {
    const enabled = parseCliOptions({ argv: ["node", "multi-manager", "--log-api-servers"], options: multiManagerCliOptions as any });
    const disabled = parseCliOptions({ argv: ["node", "multi-manager", "--no-log-api-servers"], options: multiManagerCliOptions as any });

    const base = { colors: true, logLevel: "TRACE", dumpHeap: 0, s3AccessKeyId: "", s3SecretAccessKey: "" } as any;
    const enabledConfig = new MultiManagerConfig({ ...base, logApiServers: enabled.logApiServers });
    const disabledConfig = new MultiManagerConfig({ ...base, logApiServers: disabled.logApiServers });

    t.true(MultiManager.shouldConsumeApiServerLogs(enabledConfig));
    t.false(MultiManager.shouldConsumeApiServerLogs(disabledConfig));
});
