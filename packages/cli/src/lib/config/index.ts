import { defaultConfigName, profileExists } from "../paths";
import { envs } from "../../utils/envs";
import { displayError, displayMessage } from "../output";
import { siConfig } from "./siConfig";
import { SessionConfig } from "./sessionConfig";
import { profileManager } from "./profileManager";

export { siConfig } from "./siConfig";
export { profileManager } from "./profileManager";
export const sessionConfig = new SessionConfig();
export const profileConfig = profileManager.getProfileConfig();

// eslint-disable-next-line complexity
export const initConfig = () => {
    let { profile } = siConfig.getConfig();

    if (!profile || !profileExists(profile)) {
        siConfig.setProfile(defaultConfigName);
        profile = defaultConfigName;
    }

    if (process.argv.includes("--config-path")) {
        const idx = process.argv.lastIndexOf("--config-path");

        if (process.argv.length <= idx + 1) throw Error("--config-path argument missing");
        profileManager.setFlagProfilePath(process.argv[idx + 1]);
    } else if (process.argv.includes("--config")) {
        const idx = process.argv.lastIndexOf("--config");

        if (process.argv.length <= idx + 1) throw Error("--config argument missing");
        profileManager.setFlagProfile(process.argv[idx + 1]);
    } else if (envs.siConfigPathEnv) profileManager.setEnvProfilePath(envs.siConfigPathEnv);
    else if (envs.siConfigEnv) profileManager.setEnvProfile(envs.siConfigEnv);
    else profileManager.setConfigProfile(profile);

    const profileUsed = profileManager.getProfileName();
    let config;

    try {
        config = profileConfig.getConfig();
        const isProfileConfigValid = profileConfig.validateConfig(config);

        if (isProfileConfigValid) return;
    } catch (error: any) {
        displayError(error);
    }

    if (profileUsed !== defaultConfigName) {
        displayMessage(`Profile ${profile} contain errors- using default profile instead.`);
        profileManager.useDefaultProfile();
        siConfig.setProfile(defaultConfigName);
    } else {
        displayMessage("Default Profile contain errors- reseting to base configuration.");
        profileConfig.restoreDefaultConfig();
    }
};

const getDashDefaultValue = (id: string, def: string) => {
    if (id !== "-") return id;

    if (!def) throw new Error("Previous value isn't said - you can't use '-' to replace it.");
    return def;
};

/**
 * Gets last Sequence id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getSequenceId = (id: string) => getDashDefaultValue(id, sessionConfig.getConfig().lastSequenceId);

/**
 * Gets last Instance id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getInstanceId = (id: string) => getDashDefaultValue(id, sessionConfig.getConfig().lastInstanceId);

/**
 * Gets package file path if dash is provided, otherwise returns the first argument
 *
 * @param path - dash or anything else
 * @returns the correct id
 */
export const getPackagePath = (path: string) => getDashDefaultValue(path, sessionConfig.getConfig().lastPackagePath);
