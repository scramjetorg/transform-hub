const fs = require("fs");
const os = require("os");
const path = require("path");

const defaultConfiguration = {
    configVersion: 1,
    apiUrl: "http://127.0.0.1:8000/api/v1",
    middlewareApiUrl: "",
    env: "development",
    scope: "",
    token: "",
    log: {
        debug: false,
        format: "pretty",
    },
};

let generatedPath;

function getBddConfigPath() {
    if (!generatedPath) {
        generatedPath = process.env.SCRAMJET_BDD_CONFIG_PATH ||
            path.join(os.tmpdir(), `scramjet-bdd-config-${process.pid}.json`);

        fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
        fs.writeFileSync(generatedPath, JSON.stringify(defaultConfiguration, null, 2));
    }

    return generatedPath;
}

function writeBddConfig(values = {}) {
    const configPath = getBddConfigPath();
    const current = JSON.parse(fs.readFileSync(configPath, "utf8"));
    fs.writeFileSync(configPath, JSON.stringify({ ...current, ...values }, null, 2));
    return configPath;
}

function cleanupBddConfig() {
    if (!generatedPath || process.env.SCRAMJET_BDD_CONFIG_PATH) return;
    fs.rmSync(generatedPath, { force: true });
    generatedPath = undefined;
}

module.exports = { getBddConfigPath, writeBddConfig, cleanupBddConfig };
