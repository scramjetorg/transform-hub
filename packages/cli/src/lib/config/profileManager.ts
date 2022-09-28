import { readFileSync } from "fs";
import { defaultConfigName, defaultConfigProfileFile, listDirFileNames, profileExists, profileNameToPath, profileRemove, profilesDir } from "../paths";
import ProfileConfig from "./profileConfig";
import { siConfig } from "./siConfig";

const enum ProfileSource {
    Default,
    Config,
    EnvProfile,
    EnvProfilePath,
    FlagProfile,
    FlagProfilePath,
}

// Helper class used to manage controll of precedence of different profiles
// that can be set by user.
class ProfileManager {
    private static instance: ProfileManager;
    protected source: ProfileSource;
    protected profileConfig: ProfileConfig;

    private constructor() {
        this.source = ProfileSource.Default;
        const defaultProfile = new ProfileConfig(defaultConfigProfileFile);

        if (!defaultProfile.isValid()) {
            defaultProfile.writeConfig(defaultProfile.getDefaultConfig());
            defaultProfile.setFilePath(defaultConfigProfileFile);
        }
        this.profileConfig = defaultProfile;
    }
    static getInstance(): ProfileManager {
        if (!ProfileManager.instance) {
            ProfileManager.instance = new ProfileManager();
        }
        return ProfileManager.instance;
    }
    createProfile(name: string) {
        if (profileExists(name)) throw Error(`Profile ${name} already exist`);
        const newProfile = new ProfileConfig(profileNameToPath(name));

        newProfile.writeConfig(newProfile.getDefaultConfig());
    }
    removeProfile(name: string) {
        if (!profileExists(name)) throw Error(`Unknown profile: ${name}`);
        if (name === defaultConfigName) {
            throw new Error(`You can't remove ${defaultConfigName} profile`);
        }
        profileRemove(name);
    }
    listProfiles(): string[] {
        return listDirFileNames(profilesDir);
    }
    profileExists(name: string) { return profileExists(name); }
    profileIsValid(name: string) {
        return this.profileConfig.validateConfig(new ProfileConfig(profileNameToPath(name)));
    }

    isPathSource() {
        return this.source === ProfileSource.EnvProfilePath || this.source === ProfileSource.FlagProfilePath;
    }
    getProfileName(): string {
        if (this.isPathSource())
            return "user configuration file";
        return siConfig.getConfig().profile;
    }
    setFlagProfilePathSource() {
        this.source = ProfileSource.FlagProfilePath;
    }
    getProfileConfig(): ProfileConfig {
        return this.profileConfig;
    }
    useDefaultProfile() {
        this.source = ProfileSource.Default;
        this.profileConfig.setFilePath(defaultConfigProfileFile);
    }
    setDefaultProfile() {
        if (!this.validSourcePrecedence(ProfileSource.Default)) return;
        this.useDefaultProfile();
    }
    setConfigProfile(name: string) {
        if (!this.validSourcePrecedence(ProfileSource.Config)) return;
        if (this.setProfileFromName(name)) this.source = ProfileSource.Config;
    }
    setEnvProfile(name: string) {
        if (!this.validSourcePrecedence(ProfileSource.EnvProfile)) return;
        if (this.setProfileFromName(name)) this.source = ProfileSource.EnvProfile;
    }
    setEnvProfilePath(path: string) {
        if (!this.validSourcePrecedence(ProfileSource.EnvProfilePath)) return;
        if (this.setProfileFromFile(path)) this.source = ProfileSource.EnvProfilePath;
    }
    setFlagProfile(name: string) {
        if (!this.validSourcePrecedence(ProfileSource.FlagProfile)) return;
        if (this.setProfileFromName(name)) this.source = ProfileSource.FlagProfile;
    }
    setFlagProfilePath(path: string) {
        if (!this.validSourcePrecedence(ProfileSource.FlagProfilePath)) return;
        if (this.setProfileFromFile(path)) this.source = ProfileSource.FlagProfilePath;
    }

    protected validSourcePrecedence(incomingSource: ProfileSource) {
        return incomingSource >= this.source;
    }

    protected setProfileFromName(profileName: string): boolean {
        if (!profileExists(profileName)) throw Error(`Unable to find profile: ${profileName}`);
        this.profileConfig.readOnly = false;
        this.profileConfig.setFilePath(profileNameToPath(profileName));
        return true;
    }

    protected setProfileFromFile = (path: string): boolean => {
        const fileConfig = JSON.parse(readFileSync(path, "utf-8"));

        if (!this.profileConfig.validateConfig(fileConfig)) throw Error("Invalid config file");
        this.profileConfig.readOnly = true;
        this.profileConfig.setFilePath(path);
        return true;
    };
}

export const profileManager = ProfileManager.getInstance();
