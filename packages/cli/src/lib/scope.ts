/* eslint-disable no-console */
import { existsSync, rmSync, readdirSync, readFileSync } from "fs";
import { basename, format } from "path";
import { scopesDir, configFileExt } from "./paths";

const getScopePath = (scopeName: string) => {
    const scopePath = format({ dir: scopesDir, name: scopeName, ext: configFileExt });

    if (existsSync(scopePath)) return scopePath;
    console.error(`WARN: Couldn't find scope ${scopeName}.`);
    return null;
};

/**
 * Prints list of avaliable scopes
 */
export const listScopes = () => {
    if (existsSync(scopesDir))
        readdirSync(scopesDir).forEach((scopeFile) => console.log(basename(scopeFile, configFileExt)));
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
 * Check if scope is exists.
 *
 * @param scopeName - scope name
 * @returns true if scope exists, false otherwise
 */
export const scopeExists = (scopeName: string) => getScopePath(scopeName) !== null;

/**
 * Removes scope configuration
 *
 * @param scopeName - scope name
 */
export const deleteScope = (scopeName: string) => {
    const scopePath = getScopePath(scopeName);

    if (scopePath) rmSync(scopePath);
};
