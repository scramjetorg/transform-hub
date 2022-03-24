import { homedir, tmpdir } from "os";
import { resolve } from "path";
import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { sessionId } from "../utils/sessionId";

export const configFileExt = ".json";
export const procPath = "/proc";

export const siDir = resolve(homedir(), "./.sirc");
export const scopesDir = resolve(siDir, "./scopes");

export const globalConfigFile = resolve(siDir, `.sth-cli-rc${configFileExt}`);

export const siTempDir = resolve(tmpdir(), "./.si");
export const sessionDir = resolve(siTempDir, `./${sessionId()}`);
export const sessionConfigFile = resolve(sessionDir, "./.session-config");

const initDir = (dir: string) => {
    if (existsSync(dir)) return;
    const result = mkdirSync(dir, { recursive: true });

    if (result === undefined) {
        // eslint-disable-next-line no-console
        console.error(`WARN: Couldn't create directory ${dir}.`);
    }
};

/**
 * Checks existing si session directories and compares it with list of running sessions.
 * If session no longer exists responding dir is beeing removed.
 */
const clearUnusedSessionDirs = () => {
    if (!existsSync(siTempDir)) return;
    const existingSessions = readdirSync(siTempDir).filter(Number);

    if (existingSessions.length === 0) return;
    const currentPids = readdirSync(procPath).filter(Number);

    existingSessions
        .filter((sessionPID) => !currentPids.includes(sessionPID))
        .forEach((unusedSession: string) => rmSync(resolve(siTempDir, `./${unusedSession}`), { recursive: true }));
};

/**
 * Initializes paths required in project, and clean unused ones
 */
export const initPaths = () => {
    clearUnusedSessionDirs();

    initDir(siDir);
    initDir(scopesDir);
    initDir(sessionDir);
};
