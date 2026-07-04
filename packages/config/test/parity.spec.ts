import test from "ava";
import {
    development,
    imageConfig,
    defaultConfig,
    sthDefaultConfig,
    toPublicSTHConfig,
    getRuntimeAdapterOption,
    applyManagerTrustBootstrap,
    ConfigService,
    ManagerConfigService,
    managerConfigService,
    managerDefaultConfig,
    getDefaultManagerConfig,
} from "../src";

// ---------------------------------------------------------------------------
// env.ts — development() helper
// ---------------------------------------------------------------------------

test("development returns false when PRODUCTION is set", t => {
    t.false(development({ PRODUCTION: "1" } as any));
});

test("development returns true when DEVELOPMENT is set and PRODUCTION is not", t => {
    t.true(development({ DEVELOPMENT: "1" } as any));
});

test("development returns true when SCRAMJET_DEVELOPMENT is set", t => {
    t.true(development({ SCRAMJET_DEVELOPMENT: "1" } as any));
});

test("development returns false when neither DEVELOPMENT nor SCRAMJET_DEVELOPMENT is set", t => {
    t.false(development({} as any));
});

test("development returns false when both PRODUCTION and DEVELOPMENT are set", t => {
    t.false(development({ PRODUCTION: "1", DEVELOPMENT: "1" } as any));
});

// ---------------------------------------------------------------------------
// image-config.ts
// ---------------------------------------------------------------------------

test("imageConfig has expected image tags", t => {
    t.is(imageConfig.prerunner, "scramjetorg/pre-runner:1.1.0");
    t.is(imageConfig.runner.node, "scramjetorg/runner:1.1.0");
    t.is(imageConfig.runner.python3, "scramjetorg/runner-py:1.1.0");
    t.is(imageConfig.runner.bun, "scramjetorg/runner-bun:1.1.0");
});

// ---------------------------------------------------------------------------
// default-config.ts (STH) — image merged via config-service.ts
// ---------------------------------------------------------------------------

test("defaultConfig exports as same reference as sthDefaultConfig", t => {
    t.is(defaultConfig, sthDefaultConfig);
});

test("defaultConfig has image config merged (docker.prerunner.image populated)", t => {
    t.is(defaultConfig.docker.prerunner.image, imageConfig.prerunner);
});

test("defaultConfig has image config merged (docker.runnerImages populated)", t => {
    t.is(defaultConfig.docker.runnerImages.node, imageConfig.runner.node);
    t.is(defaultConfig.docker.runnerImages.python3, imageConfig.runner.python3);
    t.is(defaultConfig.docker.runnerImages.bun, imageConfig.runner.bun);
});

test("defaultConfig has image config merged (kubernetes.runnerImages populated)", t => {
    t.is(defaultConfig.kubernetes.runnerImages.node, imageConfig.runner.node);
    t.is(defaultConfig.kubernetes.runnerImages.python3, imageConfig.runner.python3);
    t.is(defaultConfig.kubernetes.runnerImages.bun, imageConfig.runner.bun);
});

test("defaultConfig does NOT populate docker.runner.image from imageConfig", t => {
    t.is(defaultConfig.docker.runner.image, "");
});

test("defaultConfig has base STH fields", t => {
    t.is(defaultConfig.logLevel, "TRACE");
    t.is(defaultConfig.runtimeAdapter, "detect");
    t.true(defaultConfig.verser2.enabled);
    t.is(defaultConfig.verser2.hostUrl, "https://127.0.0.1:2443");
});

// ---------------------------------------------------------------------------
// runtime-adapter-option.ts
// ---------------------------------------------------------------------------

test("getRuntimeAdapterOption returns 'process' when docker is false and no adapter", t => {
    t.is(getRuntimeAdapterOption({ docker: false }), "process");
});

test("getRuntimeAdapterOption returns 'process' when --no-docker is set", t => {
    t.is(getRuntimeAdapterOption({ docker: false, runtimeAdapter: undefined }), "process");
});

test("getRuntimeAdapterOption returns runtimeAdapter when specified without docker flag", t => {
    t.is(getRuntimeAdapterOption({ runtimeAdapter: "docker" }), "docker");
});

test("getRuntimeAdapterOption throws when --no-docker and --runtime-adapter are both provided", t => {
    t.throws(() => getRuntimeAdapterOption({ docker: false, runtimeAdapter: "docker" }), {
        message: /mutually exclusive/
    });
});

test("getRuntimeAdapterOption returns undefined when docker is true", t => {
    t.is(getRuntimeAdapterOption({ docker: true }), undefined);
});

test("getRuntimeAdapterOption returns the adapter value when docker is true with adapter", t => {
    t.is(getRuntimeAdapterOption({ docker: true, runtimeAdapter: "process" }), "process");
});

// ---------------------------------------------------------------------------
// manager-trust-bootstrap.ts
// ---------------------------------------------------------------------------

// Self-signed CA cert generated with openssl for testing
// CN=test-ca, prime256v1 EC key
const testCaCert = `-----BEGIN CERTIFICATE-----
MIIBeTCCAR+gAwIBAgIUEV374ky1JteQ9K37fQWa//P+vfEwCgYIKoZIzj0EAwIw
EjEQMA4GA1UEAwwHdGVzdC1jYTAeFw0yNjA3MDMxMzQ3MTRaFw0zNjA2MzAxMzQ3
MTRaMBIxEDAOBgNVBAMMB3Rlc3QtY2EwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC
AARNt/Pmv5GIypjwkVYy5Y3J2k8pv+aa/usj/9yBhrW6JnkRLf+7Mu+F01JVnnBa
vowGoTcqosUVI1awcrFCqbfIo1MwUTAdBgNVHQ4EFgQUcCfaj/braIlE9DMbzAFk
dk4b3CYwHwYDVR0jBBgwFoAUcCfaj/braIlE9DMbzAFkdk4b3CYwDwYDVR0TAQH/
BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiEA+Ijw6OFw9+elt+pSRJZzaMC/2oe5
MV0lraguRyBlLoECIF/btZ6ynYno78l5rKuvi0kbvJyMNzcejcNxel+9LyEd
-----END CERTIFICATE-----`;

const testCaFingerprintNormalized = "013C5A40C987685AAF45DCC70FF20980426BEBF3B253627CE0CA5BFE480A472D";

test("applyManagerTrustBootstrap merges CA and hostUrl into config", t => {
    const result = applyManagerTrustBootstrap(defaultConfig, {
        ca: testCaCert,
        fingerprint256: testCaFingerprintNormalized,
        hostUrl: "https://manager.example:2443",
    });

    t.is(result.verser2.tls.ca, testCaCert);
    t.is(result.verser2.hostUrl, "https://manager.example:2443");
});

test("applyManagerTrustBootstrap throws on fingerprint mismatch", t => {
    t.throws(() => applyManagerTrustBootstrap(defaultConfig, {
        ca: testCaCert,
        fingerprint256: "INVALIDFINGERPRINT",
    }), { message: /fingerprint metadata mismatch/ });
});

// ---------------------------------------------------------------------------
// ConfigService (STH)
// ---------------------------------------------------------------------------

test("ConfigService constructor initialises with default config", t => {
    const svc = new ConfigService();
    t.is(svc.getConfig(), defaultConfig);
});

test("ConfigService.update deep-merges configuration", t => {
    const svc = new ConfigService();
    svc.update({ logLevel: "DEBUG", host: { port: 9000 } });

    t.is(svc.getConfig().logLevel, "DEBUG");
    t.is(svc.getConfig().host.port, 9000);
    // unchanged field preserved
    t.is(svc.getConfig().logColors, true);
});

test("ConfigService.getDockerConfig returns docker section", t => {
    const svc = new ConfigService();
    t.is(svc.getDockerConfig(), defaultConfig.docker);
});

test("ConfigService.getConfigInfo masks verser2 secrets and platform/couchdb fields", t => {
    const config = {
        ...defaultConfig,
        platform: { apiKey: "secret-key" },
        couchdb: { pass: "db-pass" },
    };

    const info = ConfigService.getConfigInfo(config);

    t.is((info as any).platform.apiKey, "********");
    t.is((info as any).couchdb.pass, "********");
    // verser2 keyFile should be masked (secret descriptor)
    if ((info as any).verser2?.tls?.keyFile) {
        t.is((info as any).verser2.tls.keyFile, "********");
    }
});

// ---------------------------------------------------------------------------
// toPublicSTHConfig (standalone)
// ---------------------------------------------------------------------------

test("toPublicSTHConfig strips kubernetes authConfigPath and sequencesRoot", t => {
    const config = {
        ...defaultConfig,
        kubernetes: {
            ...defaultConfig.kubernetes,
            authConfigPath: "/secret/kube-auth",
        },
    };

    const pub = toPublicSTHConfig(config);

    t.false("authConfigPath" in (pub as any).kubernetes);
    t.false("sequencesRoot" in (pub as any));
});

// ---------------------------------------------------------------------------
// Manager config
// ---------------------------------------------------------------------------

test("managerDefaultConfig has expected structure", t => {
    t.is(managerDefaultConfig.id, "cpm-manager");
    t.is(managerDefaultConfig.logLevel, "info");
    t.is(managerDefaultConfig.apiBase, "/api/v1");
    t.is(managerDefaultConfig.sthController.unhealthyTimeoutMs, 61_000);
    t.true(managerDefaultConfig.verser2.enabled);
    t.is(managerDefaultConfig.verser2.host.bindPort, 2443);
});

test("ManagerConfigService is a class", t => {
    const svc = new ManagerConfigService();
    t.true(svc instanceof ManagerConfigService);
});

test("managerConfigService is the pre-initialized singleton", t => {
    t.true(managerConfigService instanceof ManagerConfigService);
    t.is(managerConfigService.getConfig(), managerDefaultConfig);
});

test("getDefaultManagerConfig returns a deep clone", t => {
    const clone = getDefaultManagerConfig();
    t.not(clone, managerDefaultConfig);
    t.deepEqual(clone, managerDefaultConfig);
});

test("getDefaultManagerConfig clone is independent of original", t => {
    const clone = getDefaultManagerConfig();
    clone.id = "mutated";
    t.not(clone.id, managerDefaultConfig.id);
});

test("ManagerConfigService.update deep-merges config", t => {
    const svc = new ManagerConfigService();
    svc.update({ logLevel: "DEBUG", verser2: { host: { bindPort: 9999 } } });

    t.is(svc.getConfig().logLevel, "DEBUG");
    t.is(svc.getConfig().verser2.host.bindPort, 9999);
    // unchanged field preserved
    t.is(svc.getConfig().apiBase, "/api/v1");
});
