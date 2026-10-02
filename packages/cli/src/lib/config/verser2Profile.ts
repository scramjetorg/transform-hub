import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync } from "fs";
import { validateOutboundVerser2Profile, publicOutboundVerser2Profile } from "@scramjet/config";
import type { ProfileConfigEntity, Verser2ProfileConfig } from "../../types";

const envReference = /^env:\/\/([A-Za-z_][A-Za-z0-9_]*)$/;

/** File-backed client TLS variables shared with STH outbound Verser2. */
export const verser2ClientTlsEnvironment = {
    caFile: "SCRAMJET_VERSER2_CA_FILE",
    legacyCaFile: "CPM_SSL_CA_PATH",
    certFile: "SCRAMJET_VERSER2_CERT_FILE",
    keyFile: "SCRAMJET_VERSER2_KEY_FILE",
    pfxFile: "SCRAMJET_VERSER2_PFX_FILE",
    passphrase: "SCRAMJET_VERSER2_PASSPHRASE"
} as const;

/**
 * Apply process TLS variables to a selected profile in memory only. The
 * selected endpoint, broker identity, ingress, target and timeout remain
 * profile-owned; this helper never writes to the profile store.
 */
export function resolveVerser2ProfileEnvironment<T extends ProfileConfigEntity>(profile: T, env: NodeJS.ProcessEnv = process.env): T {
    const verser2 = profile.verser2;
    if (!verser2) return profile;

    const names = verser2ClientTlsEnvironment;
    const caFile = env[names.caFile] !== undefined ? env[names.caFile] : env[names.legacyCaFile];
    const certFile = env[names.certFile];
    const keyFile = env[names.keyFile];
    const pfxFile = env[names.pfxFile];
    const passphrase = env[names.passphrase];
    if ([caFile, certFile, keyFile, pfxFile, passphrase].every(value => value === undefined)) return profile;
    if (pfxFile !== undefined && (certFile !== undefined || keyFile !== undefined)) {
        throw new Error("Verser2 environment TLS must use either PFX or PEM client identity files, not both");
    }
    if (passphrase === "") throw new Error(`Verser2 passphrase environment variable is empty: ${names.passphrase}`);

    const tls = { ...verser2.tls };
    if (caFile !== undefined) tls.caFile = caFile;
    if (pfxFile !== undefined) {
        delete tls.certFile;
        delete tls.keyFile;
        tls.pfxFile = pfxFile;
    } else if (certFile !== undefined || keyFile !== undefined) {
        delete tls.pfxFile;
        if (certFile !== undefined) tls.certFile = certFile;
        if (keyFile !== undefined) tls.keyFile = keyFile;
    }
    if (passphrase !== undefined) tls.passphraseReference = `env://${names.passphrase}`;

    return { ...profile, verser2: { ...verser2, tls } };
}

function openRegularFile(path: string, secret = false): number {
    const flags = constants.O_RDONLY | ((constants as any).O_NOFOLLOW || 0);
    const descriptor = openSync(path, flags);
    const stat = fstatSync(descriptor);
    const link = lstatSync(path);
    if (!stat.isFile() || link.isSymbolicLink()) {
        closeSync(descriptor);
        throw new Error("Credential must be a regular non-symlink file");
    }
    if (secret && process.platform !== "win32") {
        if (stat.mode & 0o077 || typeof process.getuid === "function" && stat.uid !== process.getuid()) {
            closeSync(descriptor);
            throw new Error("Private credential must be owner-only");
        }
    }
    return descriptor;
}

export function resolveVerser2Passphrase(reference: string, env: NodeJS.ProcessEnv = process.env): string {
    const match = envReference.exec(reference);
    if (match) {
        const value = env[match[1]];
        if (!value) throw new Error(`Passphrase environment reference is empty: ${match[1]}`);
        return value;
    }
    const descriptor = openRegularFile(reference, true);
    try { return readFileSync(descriptor, "utf8").split(/\r?\n/, 1)[0]; } finally { closeSync(descriptor); }
}


/** Connection bootstrap revalidates profile file references immediately before use. */
export type Verser2CredentialMaterial = { ca: Buffer; cert?: Buffer; key?: Buffer; pfx?: Buffer; passphrase?: string };

/** Opens, validates, and reads credential files from the same descriptors. */
export function validateVerser2Bootstrap(config: Verser2ProfileConfig, env: NodeJS.ProcessEnv = process.env): Verser2CredentialMaterial {
    const read = (path: string, secret: boolean) => {
        const descriptor = openRegularFile(path, secret);
        try { return readFileSync(descriptor); } finally { closeSync(descriptor); }
    };
    return {
        ca: read(config.tls.caFile, false),
        cert: config.tls.certFile ? read(config.tls.certFile, false) : undefined,
        key: config.tls.keyFile ? read(config.tls.keyFile, true) : undefined,
        pfx: config.tls.pfxFile ? read(config.tls.pfxFile, true) : undefined,
        passphrase: config.tls.passphraseReference ? resolveVerser2Passphrase(config.tls.passphraseReference, env) : undefined
    };
}

export const validateVerser2Profile = validateOutboundVerser2Profile;
export const publicVerser2Profile = publicOutboundVerser2Profile;
