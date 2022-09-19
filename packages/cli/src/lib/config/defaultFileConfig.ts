import FileConfig from "./fileConfig";

export default class DefaultFileConfig extends FileConfig {
    protected defaultConfig: any;

    constructor(path: string, defaultConf: any) {
        super(path);
        this.defaultConfig = defaultConf;
    }
    getConfig() {
        const fileConfig = super.getConfig();

        return fileConfig ? fileConfig : this.defaultConfig;
    }
    getDefaultConfig() {
        return this.defaultConfig;
    }
    restoreDefaultConfig() {
        return this.writeConfig(this.getDefaultConfig());
    }

    validateConfigValue(key: string, value: any): boolean {
        type defaultConfigKey = keyof typeof this.defaultConfig;
        return this.keyExists(key) && typeof value === typeof this.defaultConfig[key as defaultConfigKey];
    }
    keyExists(key: string): boolean {
        return key in this.defaultConfig;
    }
}
