import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync } from "fs";
import { validateOutboundVerser2Profile, publicOutboundVerser2Profile } from "@scramjet/config";
import type { Verser2ProfileConfig } from "../../types";

const envReference = /^env:\/\/([A-Za-z_][A-Za-z0-9_]*)$/;

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
export function validateVerser2Bootstrap(config: Verser2ProfileConfig): Verser2CredentialMaterial {
    const read = (path: string, secret: boolean) => {
        const descriptor = openRegularFile(path, secret);
        try { return readFileSync(descriptor); } finally { closeSync(descriptor); }
    };
    return {
        ca: read(config.tls.caFile, false),
        cert: config.tls.certFile ? read(config.tls.certFile, false) : undefined,
        key: config.tls.keyFile ? read(config.tls.keyFile, true) : undefined,
        pfx: config.tls.pfxFile ? read(config.tls.pfxFile, true) : undefined,
        passphrase: config.tls.passphraseReference ? resolveVerser2Passphrase(config.tls.passphraseReference) : undefined
    };
}

export const validateVerser2Profile = validateOutboundVerser2Profile;
export const publicVerser2Profile = publicOutboundVerser2Profile;
