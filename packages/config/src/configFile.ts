import { Config } from "./config";
import { File } from "./helpers/file";

/**
 * Modifiable configuration object held in file
 */
export abstract class ConfigFile extends Config {
    protected file: File;

    constructor(filePath: string) {
        const file = new File(filePath);
        let configuration = {};

        if (file.exists() && file.isReadWritable())
            configuration = file.read() || {};

        super(configuration);
        this.file = file;
    }
    /**
     * Check if path exists
     * @returns true if path to config file exists
     */
    isValidPath(): boolean {
        return this.file.exists();
    }
    isValid(): boolean {
        return this.isValidPath() && super.isValid();
    }

    set(config: any): boolean {
        if (!super.set(config)) return false;
        return this.file.write(this.configuration);
    }
    setEntry(key: keyof Object, value: any): boolean {
        if (!super.setEntry(key, value)) return false;
        return this.file.write(this.configuration);
    }
    deleteEntry(key: keyof Object): boolean {
        if (!super.deleteEntry(key)) return false;
        return this.file.write(this.configuration);
    }
}
