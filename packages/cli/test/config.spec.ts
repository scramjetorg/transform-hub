import ProfileConfig from "../src/lib/config/profileConfig";

import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { defaultConfigProfileFile } from "../src/lib/paths";
import { parseConfigSelection } from "../src/lib/config/args";
import { ProfileManager, isProfileConfig } from "../src/lib/config/profileManager";
import fs from "fs";
import os from "os";
import path from "path";

test("CliConfig validation test", t => {
    const cliConfig = new ProfileConfig(defaultConfigProfileFile);
    const defConf = cliConfig.getDefault();

    const testConfigValidation = (key: string, validData: any[], invalidData: any[]) => {
        validData.forEach(valid => {
            t.truthy(cliConfig.validate({ ...defConf, [key]: valid }), `${key} ${valid} truthy failed`);
        });
        invalidData.forEach(invalid => {
            t.falsy(cliConfig.validate({ ...defConf, [key]: invalid }), `${key} ${invalid} falsy failed`);
        });
    };

    const validEnv = ["production", "development"];
    const validToken = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBLb3dhbHNraSIsImlhdCI6MTUxNjIzOTAyMn0.tgHyqtA_hPO94mvcY_zLpHBwvQeaYK7_9mgqjgFlZvQ"];
    const validUrl = ["http://127.0.0.1:8000/api/v1", "http://0.0.0.0:80"];

    const middlewareInvalidUrl = ["127.0.0", "someText", 123];
    const invalidUrl = [...middlewareInvalidUrl, ""];
    const invalidData = ["someText", " ", 123, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbiBLb3dhbHNraSIsImlhdCI6MTUxNjIzOTAyMn0tgHyqtA_hPO94mvcY_zLpHBwvQeaYK7_9mgqjgFlZv"];
    const invalidDataWithEmpty = [...invalidData, ""];

    testConfigValidation("apiUrl", validUrl, invalidUrl);
    testConfigValidation("middlewareApiUrl", [...validUrl, ""], middlewareInvalidUrl);
    testConfigValidation("env", validEnv, invalidDataWithEmpty);
    testConfigValidation("token", validToken, invalidData);
});

test("config path flags select a file and stop at the child command", t => {
    t.deepEqual(parseConfigSelection(["-c", "/tmp/bdd.json", "config", "print"]), {
        kind: "path",
        value: "/tmp/bdd.json",
    });
    t.deepEqual(parseConfigSelection(["--config=/tmp/bdd.json", "hub", "load"]), {
        kind: "path",
        value: "/tmp/bdd.json",
    });
    t.deepEqual(parseConfigSelection(["seq", "pack", "-c"]), undefined);
    t.deepEqual(parseConfigSelection(["--config-path", "/tmp/readonly.json", "config", "print"]), {
        kind: "readonly-path",
        value: "/tmp/readonly.json",
    });
});

test("config path flags require a value", t => {
    t.throws(() => parseConfigSelection(["-c"]), { message: "-c argument missing" });
    t.throws(() => parseConfigSelection(["--config"]), { message: "--config argument missing" });
    t.throws(() => parseConfigSelection(["--config="]), { message: "--config argument missing" });
});

test("mutable -c config path receives config mutations", t => {
    const manager = ProfileManager.getInstance();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-cli-config-test-"));
    const configPath = path.join(directory, "config.json");
    const defaults = new ProfileConfig(defaultConfigProfileFile).getDefault();

    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
    manager.useDefaultProfile();
    manager.setFlagConfigPath(configPath);

    const selected = manager.getProfileConfig();
    t.true(isProfileConfig(selected));
    if (isProfileConfig(selected)) selected.setApiUrl("http://127.0.0.1:8888/api/v1");
    t.is(JSON.parse(fs.readFileSync(configPath, "utf8")).apiUrl, "http://127.0.0.1:8888/api/v1");

    manager.useDefaultProfile();
    fs.rmSync(directory, { recursive: true, force: true });
});

test("--config-path remains read-only", t => {
    const manager = ProfileManager.getInstance();
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-cli-readonly-test-"));
    const configPath = path.join(directory, "config.json");
    const defaults = new ProfileConfig(defaultConfigProfileFile).getDefault();

    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
    manager.useDefaultProfile();
    manager.setFlagProfilePath(configPath);

    t.false(isProfileConfig(manager.getProfileConfig()));
    manager.useDefaultProfile();
    fs.rmSync(directory, { recursive: true, force: true });
});
