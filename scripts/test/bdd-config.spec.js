const test = require("ava");
const fs = require("fs");
const os = require("os");
const path = require("path");

test("BDD config is generated under the process temp directory and cleaned up", t => {
    const modulePath = require.resolve("../../bdd/lib/bdd-config.js");
    delete require.cache[modulePath];

    const bddConfig = require(modulePath);
    const configPath = bddConfig.getBddConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    t.true(configPath.startsWith(os.tmpdir()));
    t.is(config.configVersion, 1);
    t.is(config.apiUrl, "http://127.0.0.1:8000/api/v1");
    t.false(Object.prototype.hasOwnProperty.call(config, "timings"));
    t.true(fs.existsSync(configPath));

    bddConfig.cleanupBddConfig();
    t.false(fs.existsSync(configPath));
});

test("BDD config path can be overridden for the mounted Docker temp directory", t => {
    const modulePath = require.resolve("../../bdd/lib/bdd-config.js");
    const configPath = path.join(os.tmpdir(), `bdd-config-test-${process.pid}.json`);
    const previous = process.env.SCRAMJET_BDD_CONFIG_PATH;
    process.env.SCRAMJET_BDD_CONFIG_PATH = configPath;
    delete require.cache[modulePath];

    const bddConfig = require(modulePath);
    t.is(bddConfig.getBddConfigPath(), configPath);
    t.true(fs.existsSync(configPath));

    fs.rmSync(configPath, { force: true });
    if (previous === undefined) delete process.env.SCRAMJET_BDD_CONFIG_PATH;
    else process.env.SCRAMJET_BDD_CONFIG_PATH = previous;
});
