import { ProfileConfigEntity } from "../../types";
import { ReadOnlyConfigFileDefault } from "@scramjet/utility";
import { profileConfigDefault, validateProfileEntry, validateProfileKeysSize } from "./commonProfileConfig";

// Profile configuration class. Represents configuration that can be maniupulated by user.
export default class ReadOnlyProfileConfig extends ReadOnlyConfigFileDefault<ProfileConfigEntity> {
    protected readonly defaultConfiguration!: ProfileConfigEntity;

    constructor(configFile: string) {
        super(configFile, profileConfigDefault);
    }

    get apiUrl() { return this.get().apiUrl; }
    get middlewareApiUrl() { return this.get().middlewareApiUrl; }
    get env() { return this.get().env; }
    get scope() { return this.get().scope; }
    get token() { return this.get().token; }
    protected get log() { return this.get().log; }
    get debug() { return this.get().log.debug; }
    get format() { return this.get().log.format; }
    get path() { return this.file.path; }

    validate(config: Object): boolean {
        if (!validateProfileKeysSize(config))
            return false;
        return super.validate(config);
    }

    protected validateEntry(key: string, value: any): boolean | null {
        return validateProfileEntry(key, value);
    }
}
