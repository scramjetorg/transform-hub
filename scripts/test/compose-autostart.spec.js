const test = require("ava").default;
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const configuration = fs.readFileSync(path.join(__dirname, "../../docs-source/transform-hub/configuration.md"), "utf8");

function fencedYaml(label) {
    const match = configuration.match(new RegExp("```yaml\\n# " + label + "\\n([\\s\\S]*?)\\n```"));
    if (!match) throw new Error(`Missing ${label} YAML example`);
    return YAML.parse(match[1]);
}

test("Compose autostart documentation is a complete file-loaded readiness smoke", t => {
    const hubConfig = fencedYaml("sth.yaml");
    const startupConfig = fencedYaml("startup-config.yaml");
    const compose = fencedYaml("compose.yaml");
    const entry = startupConfig.sequences[0];

    t.is(hubConfig.runtimeAdapter, "process");
    t.true(hubConfig.identifyExisting);
    t.is(hubConfig.startupConfig, "/etc/scramjet/startup-config.yaml");
    t.is(entry.id, "status-service");
    t.is(entry.sequenceName, "status-service");
    t.is(entry.instanceName, "status-service-prod");
    t.true(entry.required);
    t.true(compose.services.hub.volumes.includes("./sequence-store:/var/lib/scramjet/sequences:ro"));

    t.regex(configuration, /until curl[\s\S]*api\/v1\/status[\s\S]*ready === true/);
    t.false(/\bsleep\s+\d/.test(configuration));
    t.false(/(?:apiKey|password|token|secret)\s*:\s*\S+/i.test(configuration));
});
