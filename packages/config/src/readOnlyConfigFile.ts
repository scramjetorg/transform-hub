import { File } from "./helpers/file";
import { ReadOnlyConfig } from "./readOnlyConfig";

/**
 * Configuration object held in file
 */
export abstract class ReadOnlyConfigFile extends ReadOnlyConfig {
    protected readonly file: File;

    constructor(filePath: string) {
        const file = new File(filePath);
        let configuration = {};

        if (file.exists() && file.isReadable())
            configuration = file.read();

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
}
