import { homedir, tmpdir } from "os";
import { resolve } from "path";
import { ppid } from "process";
import { existsSync, mkdirSync } from "fs";

export const configFileExt = ".json";
export const procPath = "/proc";

export const siDir = resolve(homedir(), "./.sirc");
export const scopesDir = resolve(siDir, "./scopes");

export const globalConfigFile = resolve(siDir, `.sth-cli-rc${configFileExt}`);

export const siTempDir = resolve(tmpdir(), "./.si");
export const sessionScopeDir = resolve(siTempDir, `./${ppid.toString()}`);
export const defaultScopeFile = resolve(sessionScopeDir, "./.default-scope");

export const scopeConfigExists = () => existsSync(defaultScopeFile);

const initDir = (dir: string) => {
    if (existsSync(dir)) return;
    const result = mkdirSync(dir, { recursive: true });

    if (result === undefined) {
        // eslint-disable-next-line no-console
        console.error(`WARN: Couldn't create directory ${dir}.`);
    }
};

export const initRequiredPaths = () => {
    initDir(siDir);
    initDir(scopesDir);
};
