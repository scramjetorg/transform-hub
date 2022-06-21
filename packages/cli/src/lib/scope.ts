/* eslint-disable no-console */
import { existsSync, rmSync, readFileSync } from "fs";
import { basename, format } from "path";
import { displayError, displayMessage } from "./output";
import { scopesDir, configFileExt, listDirFileNames } from "./paths";

const getScopePath = (scopeName: string) => {
    const scopePath = format({ dir: scopesDir, name: scopeName, ext: configFileExt });

    if (existsSync(scopePath)) return scopePath;
    displayError(`Couldn't find scope ${scopeName}.`);
    return null;
};

/**
 * Prints list of available scopes
 */
export const listScopes = () => {
    listDirFileNames(scopesDir).forEach((scopeFile) => displayMessage(basename(scopeFile, configFileExt)));
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
        displayError(`Parse error in scope config at ${scopePath}.`);
        return null;
    }
};

/**
 * Check if scope exists.
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
