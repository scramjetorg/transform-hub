import { ReadOnlyConfig } from "./readOnlyConfig";
import { FileBuilder, File } from "../file";

/**
 * Configuration object held in file
 */
export abstract class ReadOnlyConfigFile<Type extends Object> extends ReadOnlyConfig<Type> {
    protected readonly file: File;

    constructor(filePath: string) {
        const file = FileBuilder(filePath);
        let configuration = {} as Type;

        if (file.exists() && file.isReadable())
            configuration = file.read();

        super(configuration);
        this.file = file;
    }
    /**
     * Check if path exists
     * @returns true if path to config file exists
     */
    fileExist(): boolean {
        return this.file.exists();
    }
    isValid(): boolean {
        return this.fileExist() && super.isValid();
    }
}
