import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

import ProfileConfig from "../src/lib/config/profileConfig";
import ReadOnlyProfileConfig from "../src/lib/config/readOnlyProfileConfig";
import { profileConfigDefault } from "../src/lib/config/commonProfileConfig";
import { executeCommand, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { configCommand } from "../src/lib/commands/config";
import { getSelectedVerser2Profile, initConfig, profileManager, siConfig } from "../src/lib/config";
import { publicVerser2Profile, resolveVerser2Passphrase, resolveVerser2ProfileEnvironment, validateVerser2Bootstrap, validateVerser2Profile, verser2ClientTlsEnvironment } from "../src/lib/config/verser2Profile";
import { Verser2ProfileConfig } from "../src/types";

function setTestPassphrase(t: any, value: string) {
    const previous = process.env.VERSER2_TEST_PASSPHRASE;
    let restored = false;
    const restore = () => {
        if (restored) return;
        restored = true;
        if (previous === undefined) delete process.env.VERSER2_TEST_PASSPHRASE;
        else process.env.VERSER2_TEST_PASSPHRASE = previous;
    };

    registerAvaMemoryCleanup(t, restore);
    t.teardown(restore);
    process.env.VERSER2_TEST_PASSPHRASE = value;
    return restore;
}

function freshCliStartup(home: string, caFile?: string) {
    const packageRoot = path.resolve(__dirname, "..");
    const entry = path.join(packageRoot, "src/lib/config/index.ts");
    const script = `
        const cli = require(process.argv[1]);
        const result = () => ({ activeProfile: cli.siConfig.profile, selectedName: cli.profileManager.getProfileName(), selectedPath: cli.profileManager.getProfileConfig().path, effectiveCa: cli.getSelectedVerser2Profile()?.tls.caFile });
        try {
            cli.initConfig();
            process.stdout.write(JSON.stringify({ status: "ok", ...result() }) + "\\n");
        } catch (error) {
            process.stdout.write(JSON.stringify({ status: "error", ...result() }) + "\\n");
            process.stderr.write(String(error && error.message || error) + "\\n");
            process.exitCode = 23;
        }
    `;
    const env: NodeJS.ProcessEnv = { ...process.env, HOME: home };
    delete env.SI_CONFIG;
    delete env.SI_CONFIG_PATH;
    for (const variable of Object.values(verser2ClientTlsEnvironment)) {
        if (variable !== verser2ClientTlsEnvironment.caFile) delete env[variable];
    }
    if (caFile === undefined) delete env[verser2ClientTlsEnvironment.caFile];
    else env[verser2ClientTlsEnvironment.caFile] = caFile;
    return spawnSync(process.execPath, ["-r", require.resolve("tsx/cjs"), "-e", script, entry], {
        cwd: packageRoot,
        env,
        encoding: "utf8",
        timeout: 15_000
    });
}

baseTest.before(async () => {
    const { directory, config } = fixture();
    const file = path.join(directory, "warmup.json");
    const previousPassphrase = process.env.VERSER2_TEST_PASSPHRASE;
    process.env.VERSER2_TEST_PASSPHRASE = "warm";
    try {
        validateVerser2Profile(config);
        validateVerser2Bootstrap(config);
        publicVerser2Profile(config);
        for (const invalid of [
            { ...config, endpoint: "http://localhost" },
            { ...config, endpoint: "https://user:secret@localhost" },
            { ...config, endpoint: ["https://localhost"] as any },
            { ...config, endpoint: {} as any },
            { ...config, tls: { ...config.tls, pfxFile: config.tls.caFile } },
            { ...config, extra: true },
            { ...config, tls: { ...config.tls, passphrase: "inline" } },
            { ...config, target: {} },
            { ...config, ingress: { ...config.ingress, level: "hub" }, target: { hubId: "upstream" } }
        ]) validateVerser2Profile(invalid);
        try { validateVerser2Bootstrap({ ...config, tls: { ...config.tls, keyFile: config.tls.caFile } }); } catch (_) { /* warm expected credential failure */ }
        const link = path.join(directory, "key-link.pem");
        fs.symlinkSync(config.tls.keyFile as string, link);
        try { validateVerser2Bootstrap({ ...config, tls: { ...config.tls, keyFile: link } }); } catch (_) { /* warm expected symlink failure */ }
        const profile = new ProfileConfig(file);
        profile.restoreDefault();
        profileManager.useDefaultProfile();
        profileManager.setFlagConfigPath(file);
        const resolved = resolveCommandPath(["set", "verser2.endpoint", config.endpoint], configCommand);
        await executeCommand(parseCommandContext(resolved));
        for (const [field, value] of [["verser2.brokerId", config.brokerId], ["verser2.ingress.level", config.ingress.level], ["verser2.ingress.expectedId", config.ingress.expectedId], ["verser2.ingress.routeDomain", config.ingress.routeDomain], ["verser2.tls.caFile", config.tls.caFile], ["verser2.tls.certFile", config.tls.certFile as string], ["verser2.tls.keyFile", config.tls.keyFile as string]] as const) {
            await executeCommand(parseCommandContext(resolveCommandPath(["set", field, value], configCommand)));
        }
        try { await executeCommand(parseCommandContext(resolveCommandPath(["set", "verser2.endpoint", "https://user:secret@host"], configCommand))); } catch (_) { /* warm expected command validation failure */ }
        await executeCommand(parseCommandContext(resolveCommandPath(["set", "verser2.tls.pfxFile", "/tmp/warmup.pfx"], configCommand)));
        await executeCommand(parseCommandContext(resolveCommandPath(["reset", "verser2.tls.keyFile"], configCommand)));
        const draft = new ProfileConfig(path.join(directory, "draft.json"));
        draft.restoreDefault();
        draft.updateVerser2Draft(() => ({ endpoint: config.endpoint }));
        draft.promoteVerser2Draft();
    } finally {
        profileManager.useDefaultProfile();
        if (previousPassphrase === undefined) delete process.env.VERSER2_TEST_PASSPHRASE;
        else process.env.VERSER2_TEST_PASSPHRASE = previousPassphrase;
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

function fixture(t?: any) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-verser2-profile-"));
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        fs.rmSync(directory, { recursive: true, force: true });
    };
    if (t) {
        registerAvaMemoryCleanup(t, cleanup);
        t.teardown(cleanup);
    }
    const file = (name: string, mode: number) => {
        const target = path.join(directory, name);
        fs.writeFileSync(target, name);
        fs.chmodSync(target, mode);
        return target;
    };
    const config: Verser2ProfileConfig = {
        endpoint: "https://localhost:4233",
        brokerId: "cli.test",
        ingress: { level: "platform", expectedId: "multi-manager-a", routeDomain: "platform-a" },
        target: { spaceId: "space-a" },
        tls: { caFile: file("ca.pem", 0o644), certFile: file("cert.pem", 0o644), keyFile: file("key.pem", 0o600), passphraseReference: "env://VERSER2_TEST_PASSPHRASE" },
        timeoutMs: 1000
    };
    return { directory, config, file };
}

test("Verser2 profile validates file-backed PEM and environment passphrase references", t => {
    let fixtureValue: ReturnType<typeof fixture> | undefined = fixture(t);
    const { directory, config } = fixtureValue;
    const restorePassphrase = setTestPassphrase(t, "not-stored");
    let bootstrapFailed = false;
    try { validateVerser2Bootstrap({ ...config, tls: { ...config.tls, keyFile: config.tls.caFile } }); } catch (_) { bootstrapFailed = true; }
    const checks = [validateVerser2Profile(config), resolveVerser2Passphrase("env://VERSER2_TEST_PASSPHRASE") === "not-stored", !validateVerser2Profile({ ...config, endpoint: "http://localhost:4233" }), !validateVerser2Profile({ ...config, endpoint: "https://user:secret@localhost:4233" }), !validateVerser2Profile({ ...config, endpoint: ["https://localhost"] as any }), !validateVerser2Profile({ ...config, endpoint: {} as any }), validateVerser2Profile({ ...config, tls: { ...config.tls, keyFile: config.tls.caFile } }), bootstrapFailed];
    t.true(checks.every(Boolean));
    restorePassphrase();
    fs.rmSync(directory, { recursive: true, force: true });
});

test("selected Verser2 TLS remains unchanged when aligned environment variables are absent", t => {
    const { config } = fixture(t);
    t.is(resolveVerser2ProfileEnvironment({ verser2: config } as any, {}).verser2, config);
});

test("TLS environment paths override only selected-profile TLS in memory and preserve legacy CA alias precedence", t => {
    const { directory, config, file } = fixture(t);
    const selectedFile = path.join(directory, "selected-profile.json");
    const selectedConfig = new ProfileConfig(selectedFile);
    selectedConfig.restoreDefault();
    t.true(selectedConfig.setVerser2(config));
    const persistedBefore = fs.readFileSync(selectedFile, "utf8");
    const envCa = file("env-ca.pem", 0o644);
    const legacyCa = file("legacy-ca.pem", 0o644);
    const envCert = file("env-cert.pem", 0o644);
    const envKey = file("env-key.pem", 0o600);
    const env = {
        [verser2ClientTlsEnvironment.caFile]: envCa,
        [verser2ClientTlsEnvironment.legacyCaFile]: legacyCa,
        [verser2ClientTlsEnvironment.certFile]: envCert,
        [verser2ClientTlsEnvironment.keyFile]: envKey,
        [verser2ClientTlsEnvironment.passphrase]: "memory-only-passphrase"
    };
    const resolved = resolveVerser2ProfileEnvironment(selectedConfig.get(), env);

    t.is(resolved.verser2?.endpoint, config.endpoint, "selected endpoint remains profile-owned");
    t.deepEqual(resolved.verser2?.ingress, config.ingress, "selected ingress remains profile-owned");
    t.deepEqual(resolved.verser2?.target, config.target, "selected target remains profile-owned");
    t.deepEqual(resolved.verser2?.tls, {
        caFile: envCa,
        certFile: envCert,
        keyFile: envKey,
        passphraseReference: `env://${verser2ClientTlsEnvironment.passphrase}`
    });
    t.true(validateVerser2Profile(resolved.verser2));
    t.deepEqual(validateVerser2Bootstrap(resolved.verser2!, env), {
        ca: Buffer.from("env-ca.pem"),
        cert: Buffer.from("env-cert.pem"),
        key: Buffer.from("env-key.pem"),
        pfx: undefined,
        passphrase: "memory-only-passphrase"
    });
    t.deepEqual(selectedConfig.get().verser2?.tls, config.tls, "the active profile object is unchanged");
    t.is(fs.readFileSync(selectedFile, "utf8"), persistedBefore, "environment TLS values are never persisted");
});

test("CA environment can complete a selected Verser2 profile before startup validation", t => {
    const { config, file } = fixture(t);
    const missingCa = { ...config, tls: { ...config.tls, caFile: undefined } } as any;
    const envCa = file("startup-env-ca.pem", 0o644);

    t.false(validateVerser2Profile(missingCa));
    const resolved = resolveVerser2ProfileEnvironment({ verser2: missingCa } as any, {
        [verser2ClientTlsEnvironment.caFile]: envCa
    });

    t.true(validateVerser2Profile(resolved.verser2));
    t.is(resolved.verser2.tls.caFile, envCa);
});

test("profile loaders validate CA environment overlays before rejecting an incomplete stored Verser2 TLS profile", t => {
    const { directory, config, file } = fixture(t);
    const profileFile = path.join(directory, "env-ca-selected.json");
    const envCa = file("loader-env-ca.pem", 0o644);
    const previous = process.env[verser2ClientTlsEnvironment.caFile];
    const rawVerser2 = { ...config, tls: { ...config.tls, caFile: undefined } };
    fs.writeFileSync(profileFile, JSON.stringify({ ...profileConfigDefault, verser2: rawVerser2 }));
    process.env[verser2ClientTlsEnvironment.caFile] = envCa;
    try {
        const mutable = new ProfileConfig(profileFile);
        const readonly = new ReadOnlyProfileConfig(profileFile);
        t.true(mutable.isValid(), "mutable selected profile should validate after in-memory env overlay");
        t.true(readonly.isValid(), "read-only -c profile should validate after in-memory env overlay");
        t.is(mutable.get().verser2?.tls.caFile, undefined, "profile getter returns stored config, not the environment overlay");
        t.is(readonly.get().verser2?.tls.caFile, undefined, "read-only getter does not materialize environment values");
        t.true(validateVerser2Profile(resolveVerser2ProfileEnvironment(mutable.get()).verser2));
        const persisted = JSON.parse(fs.readFileSync(profileFile, "utf8"));
        t.is(persisted.verser2.tls.caFile, undefined, "environment values must not be persisted during profile load");
        t.false(fs.readFileSync(profileFile, "utf8").includes(envCa));
    } finally {
        if (previous === undefined) delete process.env[verser2ClientTlsEnvironment.caFile];
        else process.env[verser2ClientTlsEnvironment.caFile] = previous;
    }
});

test("initConfig rejects invalid TLS env for a valid selected profile without recovery or persistence", t => {
    const { directory, config } = fixture(t);
    const selectedPath = path.join(directory, "selected-valid.json");
    const selected = { ...profileConfigDefault, verser2: config };
    fs.writeFileSync(selectedPath, JSON.stringify(selected, null, 2));
    const invalidCa = "relative-ca.pem";
    const previousEnv = process.env[verser2ClientTlsEnvironment.caFile];
    const originalArgv = process.argv;
    const activeProfileBefore = siConfig.profile;
    process.env[verser2ClientTlsEnvironment.caFile] = invalidCa;
    process.argv = [process.argv[0], "si", "--config", selectedPath];
    try {
        let failure: Error | undefined;
        try { initConfig(); } catch (error) { failure = error as Error; }

        t.truthy(failure, "invalid TLS environment override must abort CLI initialization");
        t.regex(failure!.message, /Invalid Verser2 TLS environment override/);
        t.is((profileManager.getProfileConfig() as ProfileConfig).path, selectedPath, "explicitly selected profile stays selected");
        t.is(siConfig.profile, activeProfileBefore, "active profile selection is unchanged");
        t.deepEqual(JSON.parse(fs.readFileSync(selectedPath, "utf8")), selected, "the selected profile file is unchanged");
    } finally {
        process.argv = originalArgv;
        if (previousEnv === undefined) delete process.env[verser2ClientTlsEnvironment.caFile];
        else process.env[verser2ClientTlsEnvironment.caFile] = previousEnv;
        profileManager.useDefaultProfile();
    }
});

test("initConfig preserves explicit selection when a valid CA env completes an incomplete stored TLS section", t => {
    const { directory, config, file } = fixture(t);
    const selectedPath = path.join(directory, "selected-env-ca.json");
    const incompleteVerser2 = { ...config, tls: { ...config.tls, caFile: undefined } } as any;
    const selected = { ...profileConfigDefault, verser2: incompleteVerser2 };
    fs.writeFileSync(selectedPath, JSON.stringify(selected, null, 2));
    const envCa = file("valid-env-ca.pem", 0o644);
    const previousEnv = process.env[verser2ClientTlsEnvironment.caFile];
    const originalArgv = process.argv;
    const activeProfileBefore = siConfig.profile;
    process.env[verser2ClientTlsEnvironment.caFile] = envCa;
    process.argv = [process.argv[0], "si", "--config", selectedPath];
    try {
        initConfig();

        t.is((profileManager.getProfileConfig() as ProfileConfig).path, selectedPath, "-c profile remains selected after env validation");
        t.is(siConfig.profile, activeProfileBefore);
        t.is(getSelectedVerser2Profile()?.tls.caFile, envCa, "connection profile receives the in-memory env CA");
        const persisted = JSON.parse(fs.readFileSync(selectedPath, "utf8"));
        t.is(persisted.verser2.tls.caFile, undefined);
        t.false(fs.readFileSync(selectedPath, "utf8").includes(envCa));
    } finally {
        process.argv = originalArgv;
        if (previousEnv === undefined) delete process.env[verser2ClientTlsEnvironment.caFile];
        else process.env[verser2ClientTlsEnvironment.caFile] = previousEnv;
        profileManager.useDefaultProfile();
    }
});

test.serial("fresh ProfileManager startup does not restore a valid default profile for an invalid CA env override", t => {
    const { directory, config } = fixture(t);
    const home = path.join(directory, "fresh-home");
    const profilesDir = path.join(home, ".si", "profiles");
    const defaultProfile = path.join(profilesDir, "default.json");
    fs.mkdirSync(profilesDir, { recursive: true, mode: 0o700 });
    const stored = { ...profileConfigDefault, verser2: config };
    const storedBytes = JSON.stringify(stored, null, 2);
    fs.writeFileSync(defaultProfile, storedBytes, { mode: 0o600 });

    const result = freshCliStartup(home, "relative-ca.pem");

    t.is(result.error, undefined, "fresh CLI bootstrap process should complete its guarded initialization");
    t.is(result.status, 23, `expected invalid TLS env to abort startup: ${result.stderr}`);
    const state = JSON.parse(result.stdout);
    t.is(state.status, "error");
    t.is(state.activeProfile, "default");
    t.is(state.selectedName, "default");
    t.is(state.selectedPath, defaultProfile);
    t.regex(result.stderr, /Invalid Verser2 TLS environment override/);
    t.is(fs.readFileSync(defaultProfile, "utf8"), storedBytes, "fresh ProfileManager startup must not restore or rewrite the valid default profile");
});

test.serial("fresh ProfileManager startup keeps a valid env-only CA overlay in memory without persisting it", t => {
    const { directory, config, file } = fixture(t);
    const home = path.join(directory, "fresh-home");
    const profilesDir = path.join(home, ".si", "profiles");
    const defaultProfile = path.join(profilesDir, "default.json");
    fs.mkdirSync(profilesDir, { recursive: true, mode: 0o700 });
    const storedVerser2 = { ...config, tls: { ...config.tls, caFile: undefined } } as any;
    fs.writeFileSync(defaultProfile, JSON.stringify({ ...profileConfigDefault, verser2: storedVerser2 }, null, 2), { mode: 0o600 });
    const envCa = file("fresh-startup-env-ca.pem", 0o644);

    const result = freshCliStartup(home, envCa);

    t.is(result.error, undefined, `fresh CLI bootstrap failed: ${result.stderr}`);
    t.is(result.status, 0);
    const state = JSON.parse(result.stdout);
    t.is(state.status, "ok");
    t.is(state.activeProfile, "default");
    t.is(state.selectedName, "default");
    t.is(state.selectedPath, defaultProfile);
    t.is(state.effectiveCa, envCa);
    const persisted = JSON.parse(fs.readFileSync(defaultProfile, "utf8"));
    t.is(persisted.verser2.tls.caFile, undefined);
    t.false(fs.readFileSync(defaultProfile, "utf8").includes(envCa));
});

test.serial("fresh ProfileManager startup still restores a genuinely invalid default profile without env repair", t => {
    const { directory, config } = fixture(t);
    const home = path.join(directory, "fresh-home");
    const profilesDir = path.join(home, ".si", "profiles");
    const defaultProfile = path.join(profilesDir, "default.json");
    fs.mkdirSync(profilesDir, { recursive: true, mode: 0o700 });
    const invalidVerser2 = { ...config, tls: { ...config.tls, keyFile: undefined } } as any;
    fs.writeFileSync(defaultProfile, JSON.stringify({ ...profileConfigDefault, verser2: invalidVerser2 }, null, 2), { mode: 0o600 });

    const result = freshCliStartup(home);

    t.is(result.error, undefined, `genuine corrupt-default recovery failed: ${result.stderr}`);
    t.is(result.status, 0);
    const state = JSON.parse(result.stdout);
    t.is(state.status, "ok");
    t.is(state.activeProfile, "default");
    t.is(state.selectedName, "default");
    const recovered = JSON.parse(fs.readFileSync(defaultProfile, "utf8"));
    t.is(recovered.verser2, undefined, "invalid saved TLS must be reset when no valid env repair is present");
    t.is(recovered.apiUrl, profileConfigDefault.apiUrl);
});

test("PFX environment replaces profile PEM identity, while mixed environment identities and incomplete final PEM pairs fail", t => {
    const { config, file } = fixture(t);
    const pfxFile = file("env-client.pfx", 0o600);
    const pfx = resolveVerser2ProfileEnvironment({ verser2: config } as any, {
        [verser2ClientTlsEnvironment.pfxFile]: pfxFile,
        [verser2ClientTlsEnvironment.passphrase]: "pfx-passphrase"
    });

    t.true(validateVerser2Profile(pfx.verser2));
    t.is(pfx.verser2.tls.certFile, undefined);
    t.is(pfx.verser2.tls.keyFile, undefined);
    t.is(pfx.verser2.tls.pfxFile, pfxFile);
    t.is(pfx.verser2.tls.passphraseReference, `env://${verser2ClientTlsEnvironment.passphrase}`);
    t.throws(() => resolveVerser2ProfileEnvironment({ verser2: config } as any, {
        [verser2ClientTlsEnvironment.pfxFile]: pfxFile,
        [verser2ClientTlsEnvironment.certFile]: file("conflicting-cert.pem", 0o644)
    }));

    const withoutKey = { ...config, tls: { ...config.tls, keyFile: undefined } } as any;
    const incomplete = resolveVerser2ProfileEnvironment({ verser2: withoutKey } as any, {
        [verser2ClientTlsEnvironment.certFile]: file("incomplete-cert.pem", 0o644)
    });
    t.false(validateVerser2Profile(incomplete.verser2));
});

test("Verser2 profile supports owner-only passphrase files and redacts secret fields", t => {
    let fixtureValue: ReturnType<typeof fixture> | undefined = fixture(t);
    const { directory, config, file } = fixtureValue;
    registerAvaMemoryCleanup(t, () => { fs.rmSync(directory, { recursive: true, force: true }); fixtureValue = undefined; });
    const secret = file("passphrase", 0o600);
    fs.writeFileSync(secret, "secret\n");
    const withFile = { ...config, tls: { ...config.tls, passphraseReference: secret } };
    const resolvedPassphrase = resolveVerser2Passphrase(secret);
    const publicConfig = publicVerser2Profile(withFile);
    fs.chmodSync(secret, 0o644);
    let bootstrapRejected = false;
    try { validateVerser2Bootstrap(withFile); } catch (_) { bootstrapRejected = true; }
    const checks = [resolvedPassphrase === "secret", publicConfig.tls?.keyFile === "********", publicConfig.tls?.passphraseReference === "********", validateVerser2Profile(withFile), bootstrapRejected];
    t.true(checks.every(Boolean));
});

test("legacy profiles remain valid and Verser2 migration/reset preserves HTTP settings", t => {
    const { directory, config } = fixture(t);
    const restorePassphrase = setTestPassphrase(t, "secret");
    const profileFile = path.join(directory, "profile.json");
    const profile = new ProfileConfig(profileFile);
    profile.restoreDefault();
    const legacy = profile.get();
    t.true(profile.validate(legacy));
    t.true(profile.setVerser2(config));
    t.deepEqual(profile.get().verser2?.ingress, config.ingress);
    t.true(profile.updateVerser2(current => ({ ...current, ingress: { ...current.ingress, routeDomain: "space-b" } })));
    t.is(profile.get().verser2?.ingress.routeDomain, "space-b");
    t.true(profile.resetVerser2());
    t.is(profile.get().verser2, undefined);
    t.is(profile.get().apiUrl, legacy.apiUrl);
    restorePassphrase();
    fs.rmSync(directory, { recursive: true, force: true });
});

test("profile schema rejects unknown, inline-secret, and invalid topology/TLS shapes without resolving runtime references", t => {
    let fixtureValue: ReturnType<typeof fixture> | undefined = fixture(t);
    const { directory, config } = fixtureValue;
    registerAvaMemoryCleanup(t, () => { fs.rmSync(directory, { recursive: true, force: true }); fixtureValue = undefined; });
    const missingReference = { ...config, tls: { ...config.tls, passphraseReference: "env://NOT_PRESENT" } };
    let bootstrapRejected = false;
    try { validateVerser2Bootstrap(missingReference); } catch (_) { bootstrapRejected = true; }
    const checks = [validateVerser2Profile(missingReference), bootstrapRejected, !validateVerser2Profile({ ...config, extra: true }), !validateVerser2Profile({ ...config, tls: { ...config.tls, passphrase: "inline" } }), !validateVerser2Profile({ ...config, ingress: { ...config.ingress, level: "hub" }, target: { hubId: "upstream" } }), !validateVerser2Profile({ ...config, ingress: { ...config.ingress, level: "platform" }, target: { hubId: "hub" } }), !validateVerser2Profile({ ...config, target: {} }), validateVerser2Profile({ ...config, target: { spaceId: "space", hubId: "hub" } }), validateVerser2Profile({ ...config, ingress: { ...config.ingress, level: "space" }, target: { hubId: "hub" } }), !validateVerser2Profile({ ...config, ingress: { ...config.ingress, level: "space" }, target: { spaceId: "space" } }), !validateVerser2Profile({ ...config, tls: { ...config.tls, pfxFile: config.tls.caFile } })];
    t.true(checks.every(Boolean));
});

test("bootstrap rejects symlinked private material", t => {
    let fixtureValue: ReturnType<typeof fixture> | undefined = fixture(t);
    const { directory, config } = fixtureValue;
    registerAvaMemoryCleanup(t, () => { fs.rmSync(directory, { recursive: true, force: true }); fixtureValue = undefined; });
    const link = path.join(directory, "key-link.pem");
    fs.symlinkSync(config.tls.keyFile as string, link);
    const linked = { ...config, tls: { ...config.tls, keyFile: link } };
    let bootstrapRejected = false;
    try { validateVerser2Bootstrap(linked); } catch (_) { bootstrapRejected = true; }
    t.true(validateVerser2Profile(linked) && bootstrapRejected);
});

test("bootstrap returns opened credential material despite later path replacement", t => {
    const { directory, config } = fixture(t);
    const restorePassphrase = setTestPassphrase(t, "secret");
    const material = validateVerser2Bootstrap(config);
    fs.writeFileSync(config.tls.keyFile as string, "replacement");
    t.is(material.key?.toString(), "key.pem");
    t.is(publicVerser2Profile({ ...config, endpoint: "https://user:secret@localhost" } as any).endpoint, undefined);
    restorePassphrase();
    fs.rmSync(directory, { recursive: true, force: true });
});

test("granular Verser2 initialization, update, and field reset preserve legacy profiles", t => {
    const { directory, config } = fixture(t);
    const profile = new ProfileConfig(path.join(directory, "granular.json"));
    profile.restoreDefault();
    t.true(profile.updateVerser2Draft(current => ({ ...current, endpoint: config.endpoint })));
    t.is(profile.get().verser2, undefined);
    t.true(profile.validate(profile.get()));
    t.is(JSON.parse(fs.readFileSync(path.join(directory, "granular.json"), "utf8")).verser2Draft.endpoint, config.endpoint);
    t.true(profile.setVerser2(config));
    t.true(profile.updateVerser2(current => ({ ...current, brokerId: "changed" })));
    t.is(profile.get().verser2?.brokerId, "changed");
    t.true(profile.resetVerser2Field("brokerId"));
    t.is((profile.get() as any).verser2?.brokerId, "changed");
    t.true(profile.resetVerser2());
    t.true(profile.validate(profile.get()));
    fs.rmSync(directory, { recursive: true, force: true });
});

test("inactive drafts persist across fresh profiles and reject unsafe leaf entries", t => {
    const { directory } = fixture(t);
    const file = path.join(directory, "draft.json");
    const first = new ProfileConfig(file);
    first.restoreDefault();
    t.true(first.updateVerser2Draft(() => ({ ingress: { level: "platform" } })));
    t.false(first.updateVerser2Draft(() => ({ tls: { passphrase: "inline" } })));
    t.false(first.updateVerser2Draft(() => ({ tls: { keyFile: "https://secret" } })));
    const reloaded = new ProfileConfig(file);
    t.is(reloaded.get().verser2, undefined);
    t.is(reloaded.getEntry("verser2Draft"), null);
    t.is(reloaded.get().apiUrl, "http://127.0.0.1:8000/api/v1");
    const readonly = new ReadOnlyProfileConfig(file);
    t.is(readonly.get().verser2, undefined);
    t.is(readonly.getEntry("verser2Draft"), null);
    t.is(JSON.parse(fs.readFileSync(file, "utf8")).verser2Draft.ingress.level, "platform");
    fs.rmSync(directory, { recursive: true, force: true });
});

test("draft leaves require strict primitive URL, identity, topology, and secret-reference values", t => {
    const { directory } = fixture(t);
    const profile = new ProfileConfig(path.join(directory, "strict-draft.json"));
    profile.restoreDefault();
    for (const draft of [
        { endpoint: ["https://host"] }, { endpoint: "https://user:pass@host" }, { brokerId: "has space" },
        { ingress: { level: "invalid" } }, { ingress: { expectedId: "bad id" } }, { ingress: { routeDomain: "bad/id" } },
        { tls: { passphraseReference: "env://bad-name" } }, { tls: { caFile: "https://path" } },
        { ingress: { level: "hub" }, target: { hubId: "hub" } }
    ]) t.false(profile.updateVerser2Draft(() => draft as any));
    fs.rmSync(directory, { recursive: true, force: true });
});

test("draft promotion is atomic across reload and incomplete drafts remain inactive", t => {
    const { directory, config } = fixture(t);
    const file = path.join(directory, "promote.json");
    const profile = new ProfileConfig(file);
    profile.restoreDefault();
    t.true(profile.updateVerser2Draft(() => ({ endpoint: config.endpoint })));
    t.false(profile.promoteVerser2Draft());
    t.is(profile.get().verser2, undefined);
    t.is(JSON.parse(fs.readFileSync(file, "utf8")).verser2Draft.endpoint, config.endpoint);
    t.true(profile.updateVerser2Draft(() => ({ ...config })));
    const reloaded = new ProfileConfig(file);
    t.true(reloaded.promoteVerser2Draft());
    t.deepEqual(reloaded.get().verser2?.ingress, config.ingress);
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    t.is(stored.verser2Draft, undefined);
    t.is(stored.apiUrl, "http://127.0.0.1:8000/api/v1");
    fs.rmSync(directory, { recursive: true, force: true });
});

test("draft PEM and PFX mutations transition atomically and reset stays inactive", t => {
    const { directory, config } = fixture(t);
    const profile = new ProfileConfig(path.join(directory, "tls-draft.json"));
    profile.restoreDefault();
    t.true(profile.updateVerser2Draft(() => ({ ...config })));
    t.true(profile.setVerser2DraftTls("pfxFile", "/tmp/client.pfx"));
    let draft = JSON.parse(fs.readFileSync(profile.path, "utf8")).verser2Draft;
    t.is(draft.tls.pfxFile, "/tmp/client.pfx");
    t.is(draft.tls.certFile, undefined);
    t.is(draft.tls.keyFile, undefined);
    t.true(profile.setVerser2DraftTls("certFile", "/tmp/client.crt"));
    t.true(profile.setVerser2DraftTls("keyFile", "/tmp/client.key"));
    draft = JSON.parse(fs.readFileSync(profile.path, "utf8")).verser2Draft;
    t.is(draft.tls.pfxFile, undefined);
    t.is(draft.tls.certFile, "/tmp/client.crt");
    t.true(profile.resetVerser2Field("tls.keyFile"));
    t.is(profile.get().verser2, undefined);
    draft = JSON.parse(fs.readFileSync(profile.path, "utf8")).verser2Draft;
    t.is(draft.tls.keyFile, undefined);
    fs.rmSync(directory, { recursive: true, force: true });
});

test("failed promotion and reset preserve exact active and persisted state", t => {
    const { directory, config } = fixture(t);
    const file = path.join(directory, "rollback.json");
    const profile = new ProfileConfig(file);
    profile.restoreDefault();
    t.true(profile.setVerser2(config));
    t.true(profile.updateVerser2Draft(() => ({ ...config })));
    const beforeMemory = JSON.stringify((profile as any).configuration);
    const beforeDisk = fs.readFileSync(file, "utf8");
    const backing = (profile as any).file;
    const targetPath = backing.path;
    backing.path = directory;
    t.false(profile.promoteVerser2Draft());
    t.false(profile.resetVerser2Field("tls.keyFile"));
    t.is(JSON.stringify((profile as any).configuration), beforeMemory);
    t.is(fs.readFileSync(file, "utf8"), beforeDisk);
    backing.path = targetPath;
    t.false(fs.readdirSync(directory).some(name => name.includes(".tmp-")));
    fs.rmSync(directory, { recursive: true, force: true });
});

test("candidate persistence preserves restrictive existing mode and uses 0600 for new profiles", t => {
    const { directory, config } = fixture(t);
    const existingFile = path.join(directory, "mode-existing.json");
    const existing = new ProfileConfig(existingFile);
    existing.restoreDefault();
    fs.chmodSync(existingFile, 0o640);
    t.true(existing.updateVerser2Draft(() => ({ endpoint: config.endpoint })));
    t.is(statMode(existingFile), 0o640);
    if (process.platform !== "win32") {
        const stat = fs.statSync(existingFile);
        t.is(stat.uid, typeof process.getuid === "function" ? process.getuid() : stat.uid);
        t.is(stat.gid, typeof process.getgid === "function" ? process.getgid() : stat.gid);
    }

    const newFile = path.join(directory, "mode-new.json");
    let originalUmask: number | undefined;
    try {
        originalUmask = process.umask(0o022);
    } catch {
        // Node Worker threads do not permit changing the process-wide umask.
    }
    try {
        const fresh = new ProfileConfig(newFile);
        fs.unlinkSync(newFile);
        t.true(fresh.updateVerser2Draft(() => ({ endpoint: config.endpoint })));
        t.is(statMode(newFile), 0o600);
    } finally {
        if (originalUmask !== undefined) process.umask(originalUmask);
    }
    fs.rmSync(directory, { recursive: true, force: true });
});

test("atomic candidate persistence does not follow a symlinked profile target or leave sibling temps", t => {
    const { directory, config } = fixture(t);
    const victim = path.join(directory, "victim.json");
    const profilePath = path.join(directory, "profile-link.json");
    fs.writeFileSync(victim, JSON.stringify({ configVersion: 1, apiUrl: "http://127.0.0.1:8000/api/v1", middlewareApiUrl: "", env: "development", scope: "", token: "", log: { debug: false, format: "pretty" } }));
    fs.symlinkSync(victim, profilePath);
    const profile = new ProfileConfig(profilePath);
    t.true(profile.updateVerser2Draft(() => ({ endpoint: config.endpoint })));
    t.false(fs.readFileSync(victim, "utf8").includes("verser2Draft"));
    t.false(fs.lstatSync(profilePath).isSymbolicLink());
    t.false(fs.readdirSync(directory).some(name => name.includes(".tmp-")));
    fs.rmSync(directory, { recursive: true, force: true });
});

function statMode(file: string): number {
    return fs.statSync(file).mode & 0o777;
}

test("dotted config leaves persist drafts and promote through descriptor actions", async t => {
    let fixtureValue: ReturnType<typeof fixture> | undefined = fixture(t);
    const { directory, config } = fixtureValue;
    registerAvaMemoryCleanup(t, () => { profileManager.useDefaultProfile(); fs.rmSync(directory, { recursive: true, force: true }); fixtureValue = undefined; });
    const file = path.join(directory, "command-profile.json");
    const initial = new ProfileConfig(file);
    initial.restoreDefault();
    profileManager.useDefaultProfile();
    profileManager.setFlagConfigPath(file);
    const run = async (name: string, value?: string) => {
        const resolved = resolveCommandPath(value === undefined ? ["set", name] : ["set", name, value], configCommand);
        await executeCommand(parseCommandContext(resolved));
    };
    await run("verser2.endpoint", config.endpoint);
    await run("verser2.brokerId", config.brokerId);
    await run("verser2.ingress.level", config.ingress.level);
    await run("verser2.ingress.expectedId", config.ingress.expectedId);
    await run("verser2.ingress.routeDomain", config.ingress.routeDomain);
    await run("verser2.tls.caFile", config.tls.caFile);
    await run("verser2.tls.certFile", config.tls.certFile as string);
    await run("verser2.tls.keyFile", config.tls.keyFile as string);
    let reloaded: ProfileConfig | undefined = new ProfileConfig(file);
    const checks = [JSON.stringify(reloaded.get().verser2?.ingress) === JSON.stringify(config.ingress), reloaded.get().apiUrl === "http://127.0.0.1:8000/api/v1"];
    await run("verser2.tls.pfxFile", "/tmp/client.pfx");
    let current: ProfileConfig | undefined = new ProfileConfig(file);
    checks.push(current.get().verser2?.tls.pfxFile === "/tmp/client.pfx", current.get().verser2?.tls.certFile === undefined);
    await run("verser2.tls.certFile", config.tls.certFile as string);
    await run("verser2.tls.keyFile", config.tls.keyFile as string);
    current = new ProfileConfig(file);
    checks.push(current.get().verser2?.tls.pfxFile === undefined, current.get().verser2?.tls.keyFile === config.tls.keyFile);
    const invalid = resolveCommandPath(["set", "verser2.endpoint", "https://user:secret@host"], configCommand);
    let invalidRejected = false;
    try { await executeCommand(parseCommandContext(invalid)); } catch (_) { invalidRejected = true; }
    const reset = resolveCommandPath(["reset", "verser2.tls.keyFile"], configCommand);
    await executeCommand(parseCommandContext(reset));
    current = new ProfileConfig(file);
    checks.push(invalidRejected, current.get().verser2?.tls.keyFile === config.tls.keyFile, JSON.parse(fs.readFileSync(file, "utf8")).verser2Draft.tls.keyFile === undefined);
    reloaded = undefined;
    current = undefined;
    t.true(checks.every(Boolean));
});
