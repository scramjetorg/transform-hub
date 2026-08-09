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
    get apiClients() { return this.get().log.apiClients !== false; }
    get format() { return this.get().log.format; }
    get path() { return this.file.path; }
    get(): ProfileConfigEntity {
        const stored = super.get() as ProfileConfigEntity;
        const { verser2Draft: _draft, ...active } = stored;
        return active;
    }
    getEntry(key: keyof ProfileConfigEntity): any | null {
        return key === "verser2Draft" ? null : super.getEntry(key);
    }

    validate(config: Object): boolean {
        if (!validateProfileKeysSize(config))
            return false;
        return super.validate(config);
    }

    protected validateEntry(key: string, value: any): boolean | null {
        return validateProfileEntry(key, value);
    }
}
