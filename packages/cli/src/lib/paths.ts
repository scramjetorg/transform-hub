import { homedir, tmpdir } from "os";
import { basename, resolve } from "path";
import { accessSync, constants, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { sessionId } from "../utils/sessionId";

export const configFileExt = ".json";

export const siDir = resolve(homedir(), "./.si");
export const scopesDir = resolve(siDir, "./scopes");
export const profilesDir = resolve(siDir, "./profiles");
export const siTempDir = resolve(tmpdir(), "./.si-tmp");
export const sessionDir = resolve(siTempDir, `./${sessionId()}`);
export const sessionConfigFile = resolve(sessionDir, `./session-config${configFileExt}`);
export const siConfigFile = resolve(siDir, `si-config${configFileExt}`);

export const defaultConfigName = "default";
export const defaultConfigProfileFile = resolve(profilesDir, `${defaultConfigName}${configFileExt}`);

export const listDirFileNames = (dir: string) => {
    if (!existsSync(dir)) throw Error(`Unable to find directory: ${dir}`);
    return readdirSync(dir).map((file) => basename(file, configFileExt));
};

export const profileExists = (name: string) => listDirFileNames(profilesDir).includes(name);
export const profileNameToPath = (name: string) => resolve(profilesDir, `${name}${configFileExt}`);
export const profileRemove = (name: string) => rmSync(profileNameToPath(name));

const initDir = (dir: string) => {
    if (existsSync(dir)) return;
    const result = mkdirSync(dir, { recursive: true });

    if (result === undefined) {
        throw Error(`Couldn't create directory ${dir}`);
    }
};

const procPath = "/proc";
/**
 * Checks existing si session directories and compares it with list of running sessions.
 * If session no longer exists and current user has sufficient permissions, responding dir is being removed.
 */
const clearUnusedSessionDirs = () => {
    if (!existsSync(siTempDir)) return;

    const existingSessionsDirs = readdirSync(siTempDir).filter(sessionDirname => {
        if (!Number(sessionDirname)) return false;

        try {
            accessSync(resolve(siTempDir, sessionDirname), constants.W_OK);
            return true;
        } catch (_e) {
            return false;
        }
    });

    if (existingSessionsDirs.length === 0) return;

    const currentPids = readdirSync(procPath).filter(Number);

    existingSessionsDirs
        .filter((sessionPID) => !currentPids.includes(sessionPID))
        .forEach((unusedSession: string) => {
            rmSync(resolve(siTempDir, `./${unusedSession}`), { recursive: true });
        });
};

/**
 * Initializes paths required in project
 */
export const initPaths = () => {
    clearUnusedSessionDirs();
    initDir(siDir);
    initDir(profilesDir);
    initDir(scopesDir);
};
