import { defaultConfigName, profileExists } from "../paths";
import { envs } from "../../utils/envs";
import { displayError } from "../output";
import { SiConfig } from "./siConfig";
import ProfileConfig from "./profileConfig";
import { SessionConfig } from "./sessionConfig";
import { ProfileManager } from "./profileManager";
import ReadOnlyProfileConfig from "./readOnlyProfileConfig";
import { parseConfigSelection } from "./args";

export { ProfileConfig, ReadOnlyProfileConfig };
export { isProfileConfig } from "./profileManager";

export const profileManager = ProfileManager.getInstance();
export const siConfig = SiConfig.getInstance();
export const sessionConfig = new SessionConfig();
//export const profileConfig = profileManager.getProfileConfig();

profileManager.setConfigProfile(profileManager.getProfileName());

export const initConfig = () => {
    let profile = siConfig.profile;

    if (!profile || !profileExists(profile)) {
        siConfig.setProfile(defaultConfigName);
        profile = defaultConfigName;
    }

    const configSelection = parseConfigSelection(process.argv.slice(2));

    if (configSelection?.kind === "readonly-path") {
        profileManager.setFlagProfilePath(configSelection.value);
    } else if (configSelection?.kind === "path") {
        profileManager.setFlagConfigPath(configSelection.value);
    } else if (envs.siConfigPathEnv) profileManager.setEnvProfilePath(envs.siConfigPathEnv);
    else if (envs.siConfigEnv) profileManager.setEnvProfile(envs.siConfigEnv);
    else profileManager.setConfigProfile(profile);

    const profileConfig = profileManager.getProfileConfig();

    try {
        const isProfileConfigValid = profileConfig.validate(profileConfig.get());

        if (isProfileConfigValid) return;
    } catch (error: any) {
        displayError(error);
    }

    const profileUsed = profileManager.getProfileName();

    throw new Error(`Selected profile ${profileUsed} is invalid; refusing to fall back to the default profile`);
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
export const getSequenceId = (id: string) => getDashDefaultValue(id, sessionConfig.lastSequenceId);

/**
 * Gets last Instance id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getInstanceId = (id: string) => getDashDefaultValue(id, sessionConfig.lastInstanceId);

/**
 * Gets package file path if dash is provided, otherwise returns the first argument
 *
 * @param path - dash or anything else
 * @returns the correct id
 */
export const getPackagePath = (path: string) => getDashDefaultValue(path, sessionConfig.lastPackagePath);
