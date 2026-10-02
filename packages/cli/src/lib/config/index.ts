import { defaultConfigName, profileExists } from "../paths";
import { envs } from "../../utils/envs";
import { displayError, displayMessage } from "../output";
import { SiConfig } from "./siConfig";
import { SessionConfig } from "./sessionConfig";
import { ProfileManager } from "./profileManager";
import ProfileConfig from "./profileConfig";
import ReadOnlyProfileConfig from "./readOnlyProfileConfig";
import { parseConfigSelection } from "./args";
import { resolveVerser2ProfileEnvironment, verser2ClientTlsEnvironment } from "./verser2Profile";

export { ProfileConfig, ReadOnlyProfileConfig };
export { isProfileConfig } from "./profileManager";
export { resolveVerser2ProfileEnvironment, verser2ClientTlsEnvironment } from "./verser2Profile";

export const profileManager = ProfileManager.getInstance();
export const siConfig = SiConfig.getInstance();
export const sessionConfig = new SessionConfig();
//export const profileConfig = profileManager.getProfileConfig();

export function getSelectedVerser2Profile() {
    return resolveVerser2ProfileEnvironment(profileManager.getProfileConfig().getStoredConfig()).verser2;
}

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
    const storedProfile = profileConfig.getStoredConfig();
    const storedProfileIsValid = profileConfig.validateStored(storedProfile);
    let effectiveProfileIsValid = false;
    let effectiveProfileError: unknown;

    try {
        const effectiveProfile = resolveVerser2ProfileEnvironment(storedProfile);
        effectiveProfileIsValid = profileConfig.validate(effectiveProfile);
    } catch (error) {
        effectiveProfileError = error;
    }

    if (effectiveProfileIsValid) return;

    const hasTlsEnvironmentOverride = storedProfile.verser2 !== undefined &&
        Object.values(verser2ClientTlsEnvironment).some(name => process.env[name] !== undefined);
    if (storedProfileIsValid && hasTlsEnvironmentOverride) {
        const error = new Error("Invalid Verser2 TLS environment override for the selected profile; the saved profile and selection were left unchanged.");
        displayError(error);
        throw error;
    }

    if (effectiveProfileError) displayError(effectiveProfileError as Error);

    const profileUsed = profileManager.getProfileName();

    if (profileUsed !== defaultConfigName) {
        displayMessage(`Profile ${profile} contain errors- using default profile instead.`);
        profileManager.useDefaultProfile();
        siConfig.setProfile(defaultConfigName);
    } else {
        displayMessage("Default Profile contain errors- reseting to base configuration.");
        (profileManager.getProfileConfig() as ProfileConfig).restoreDefault();
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
