import { defaultConfigName, defaultConfigProfileFile, listDirFileNames, profileExists, profileNameToPath, profileRemove, profilesDir } from "../paths";
import ProfileConfig from "./profileConfig";
import ReadOnlyProfileConfig from "./readOnlyProfileConfig";
import { SiConfig } from "./siConfig";

const enum ProfileSource {
    Default,
    Config,
    EnvProfile,
    EnvProfilePath,
    FlagProfile,
    FlagProfilePath,
}

export const isProfileConfig = (profile: ProfileConfig | ReadOnlyProfileConfig): profile is ProfileConfig => {
    return (profile as ProfileConfig).set !== undefined;
};

// Helper class used to manage controll of precedence of different profiles
// that can be set by user.
export class ProfileManager {
    // eslint-disable-next-line no-use-before-define
    private static instance: ProfileManager;
    protected source: ProfileSource;
    protected profileConfig: ProfileConfig | ReadOnlyProfileConfig;

    private constructor() {
        this.source = ProfileSource.Default;
        const defaultProfile = new ProfileConfig(defaultConfigProfileFile);

        if (!defaultProfile.isValid()) {
            defaultProfile.restoreDefault();
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
        new ProfileConfig(profileNameToPath(name)).restoreDefault();
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
        return new ProfileConfig(profileNameToPath(name)).isValid();
    }

    isPathSource() {
        return this.source === ProfileSource.EnvProfilePath || this.source === ProfileSource.FlagProfilePath;
    }
    getProfileName(): string {
        if (this.isPathSource())
            return "user configuration file";
        return SiConfig.getInstance().profile;
    }
    setFlagProfilePathSource() {
        this.source = ProfileSource.FlagProfilePath;
    }
    getProfileConfig(): ProfileConfig | ReadOnlyProfileConfig {
        return this.profileConfig;
    }
    useDefaultProfile() {
        this.source = ProfileSource.Default;
        this.profileConfig = new ProfileConfig(defaultConfigProfileFile);
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
        this.profileConfig = new ProfileConfig(profileNameToPath(profileName));
        return true;
    }

    protected setProfileFromFile = (path: string): boolean => {
        const userProfileConfigFile = new ReadOnlyProfileConfig(path);

        if (!userProfileConfigFile.isValid()) throw Error("Invalid config file");
        this.profileConfig = userProfileConfigFile;
        return true;
    };
}

