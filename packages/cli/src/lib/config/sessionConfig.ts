import { ConfigFileDefault } from "@scramjet/utility";
import { SessionConfigEntity } from "../../types";
import { sessionId } from "../../utils/sessionId";
import { sessionConfigFile } from "../paths";
import { closeSync, existsSync, fchmodSync, fchownSync, fsyncSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { dirname, extname } from "path";
import { randomBytes } from "crypto";

// Session configuration represents configuration used internally
// that is stored and used through current shell session time that runs Cli.
export class SessionConfig extends ConfigFileDefault<SessionConfigEntity> {
    constructor() {
        const defaultSessionConfig: SessionConfigEntity = {
            lastPackagePath: "",
            lastInstanceId: "",
            lastSequenceId: "",
            lastSpaceId: "",
            lastHubId: "",
            sessionId: sessionId()
        };

        super(sessionConfigFile, defaultSessionConfig);
    }

    get lastPackagePath() { return this.get().lastPackagePath; }
    get lastInstanceId() { return this.get().lastInstanceId; }
    get lastSequenceId() { return this.get().lastSequenceId; }
    get lastSpaceId() { return this.get().lastSpaceId; }
    get lastHubId() { return this.get().lastHubId; }
    get sessionId() { return this.get().sessionId; }

    setLastPackagePath(lastPackagePath: string): boolean {
        return this.setEntry("lastPackagePath", lastPackagePath);
    }
    setLastInstanceId(lastInstanceId: string): boolean {
        return this.setEntry("lastInstanceId", lastInstanceId);
    }
    setLastSequenceId(lastSequenceId: string): boolean {
        return this.setEntry("lastSequenceId", lastSequenceId);
    }
    setLastSpaceId(lastSpaceId: string): boolean {
        return this.setEntry("lastSpaceId", lastSpaceId);
    }
    setLastHubId(lastHubId: string): boolean {
        return this.setEntry("lastHubId", lastHubId);
    }
    protected validateEntry(key: string): boolean | null {
        switch (key) {
            case "lastPackagePath":
            case "lastSpaceId":
            case "lastSequenceId":
            case "lastHubId":
            case "lastInstanceId":
            case "sessionId":
                return null;
            default:
                return false;
        }
    }

    /**
     * Persists the session configuration atomically. The generic default writes
     * directly to the target file, which truncates it before the new content
     * lands; because every CLI process in the same shell session shares this
     * file, a concurrently starting process could read the truncated file and
     * fail to parse it. Writing to a unique temporary file in the same
     * directory and renaming it into place guarantees concurrent readers only
     * ever observe complete content.
     */
    protected createIfNotExistAndWrite(value: any): boolean {
        if (!this.fileExist()) {
            try {
                mkdirSync(dirname(this.file.path), { recursive: true });
            } catch (_) {
                return false;
            }
        }
        return this.persistAtomically(value);
    }

    private persistAtomically(value: any): boolean {
        const targetPath = this.file.path;
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
            if (descriptor !== undefined) closeSync(descriptor);
            if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
            return false;
        }
    }
}
