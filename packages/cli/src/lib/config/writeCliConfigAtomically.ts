import { closeSync, existsSync, fchmodSync, fchownSync, fsyncSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { dirname, extname } from "path";
import { randomBytes } from "crypto";

/** Persist a CLI JSON configuration without exposing a partially-written target. */
export function writeCliConfigAtomically(targetPath: string, value: any): boolean {
    try {
        mkdirSync(dirname(targetPath), { recursive: true });
    } catch (_) {
        return false;
    }

    const extension = extname(targetPath);
    const temporaryPath = `${targetPath.slice(0, targetPath.length - extension.length)}.tmp-${randomBytes(16).toString("hex")}${extension}`;
    let descriptor: number | undefined;
    try {
        const existing = (() => {
            try {
                return statSync(targetPath);
            } catch (_) {
                return undefined;
            }
        })();
        const mode = existing ? existing.mode & 0o777 : 0o600;
        descriptor = openSync(temporaryPath, "wx", mode);
        fchmodSync(descriptor, mode);
        if (existing && process.platform !== "win32") fchownSync(descriptor, existing.uid, existing.gid);
        writeFileSync(descriptor, JSON.stringify(value, null, 2), "utf8");
        fsyncSync(descriptor);
        closeSync(descriptor);
        descriptor = undefined;
        renameSync(temporaryPath, targetPath);
        return true;
    } catch (_) {
        if (descriptor !== undefined) {
            try { closeSync(descriptor); } catch (_) { /* already closed */ }
        }
        try {
            if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
        } catch (_) { /* preserve the original persistence failure */ }
        return false;
    }
}
