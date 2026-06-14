import test from "ava";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MultiManagerConfig } from "../../src/config/multi-manager-configuration";

test("MultiManagerConfig preserves falsy values from config file", t => {
    const dir = mkdtempSync(join(tmpdir(), "multi-manager-config-"));
    const config = join(dir, "config.json");

    writeFileSync(config, JSON.stringify({
        logColors: false,
        s3: {
            endPoint: "",
            accessKey: "",
            secretKey: "",
            bucket: "",
            port: 9000,
            useSSL: false,
            region: "",
            bucketLimit: 5
        },
        monitoringServer: {
            host: "",
            path: "",
            port: 10000
        }
    }));

    const loaded = new MultiManagerConfig({ config, colors: true, dumpHeap: 0, logLevel: "TRACE", s3AccessKeyId: "", s3SecretAccessKey: "" }).get();

    t.false(loaded.logColors);
    t.false(loaded.s3!.useSSL);
    t.is(loaded.s3!.endPoint, "");
    t.is(loaded.s3!.accessKey, "");
    t.is(loaded.s3!.secretKey, "");
    t.is(loaded.s3!.bucket, "");
    t.is(loaded.s3!.region, "");
    t.is(loaded.monitoringServer!.host, "");
    t.is(loaded.monitoringServer!.path, "");
});
