/* eslint-disable no-console */
import { existsSync, mkdirSync, rmSync, symlinkSync, readdirSync, readFileSync, unlinkSync, rmdirSync } from "fs";
import { basename, format, resolve } from "path";
import { scopesDir, siTempDir, sessionScopeDir, defaultScope } from "./paths";

const scopeFileExtName = ".json";

export const clearUnusedSessionScopes = () => {
    if (!existsSync(siTempDir)) return;
    const existingSessions = readdirSync(siTempDir).filter(Number);

    if (existingSessions.length === 0) return;
    const currentPids = readdirSync("/proc/").filter(Number);

    existingSessions
        .filter((sessionPID) => !currentPids.includes(sessionPID))
        .forEach((unusedSession: string) => rmdirSync(resolve(siTempDir, `./${unusedSession}`), { recursive: true }));
};

const getScopePath = (scopeName: string) => {
    const scopePath = format({ dir: scopesDir, name: scopeName, ext: scopeFileExtName });

    if (existsSync(scopePath)) return scopePath;
    console.error(`WARN: Couldn't find scope ${scopeName}.`);
    return null;
};

/**
 * Prints list of avaliable scopes
 */
export const listScopes = () => {
    // clearUnusedSessionScopes();

    if (existsSync(scopesDir))
        readdirSync(scopesDir).forEach((scopeFile) => console.log(basename(scopeFile, scopeFileExtName)));
};

/**
 * Returns scope configuration object
 *
 * @param scopeName - scope name
 * @returns - scope configuration if exists or null
 */
export const getScope = (scopeName: string) => {
    const scopePath = getScopePath(scopeName);

    if (!scopePath) return null;

    try {
        const scopeConfig = JSON.parse(readFileSync(scopePath, "utf-8"));

        return scopeConfig;
    } catch {
        console.error(`WARN: Parse error in config at ${scopePath}.`);
        return null;
    }
};

/**
 * Creates symbolic link aiming to selected scope
 *
 * @param scopeName - scope name
 */
export const useScope = (scopeName: string) => {
    const scopePath = getScopePath(scopeName);

    if (!scopePath) return;
    if (existsSync(defaultScope)) unlinkSync(defaultScope);
    else if (!existsSync(sessionScopeDir)) {
        const mkdirResult = mkdirSync(sessionScopeDir, { recursive: true });

        if (mkdirResult === undefined) {
            console.error(`WARN: Couldn't create directory ${sessionScopeDir}.`);
            return;
        }
    }
    symlinkSync(scopePath, defaultScope);
};

/**
 * Removes scope configuration
 *
 * @param scopeName - scope name
 */
export const deleteScope = (scopeName: string) => {
    const scopePath = getScopePath(scopeName);

    if (scopePath) rmSync(scopePath);
};
