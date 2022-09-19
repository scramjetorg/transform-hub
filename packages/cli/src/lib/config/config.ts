export default abstract class Config {
    abstract getConfig(): any | null;
    abstract writeConfig(config: any): boolean;
    abstract setConfigValue(key: string, value: any): boolean | void;
    abstract getConfigValue(key: string): any;
    abstract delConfigValue(key: string): boolean;
    abstract keyExists(key: string): boolean;
    abstract validateConfigValue(key: string, value: any): boolean | void;
}
