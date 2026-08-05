import { Config } from "./config";
import { FileBuilder, File } from "../file";

/**
 * Modifiable configuration object held in file
 */
export abstract class ConfigFile<Type extends Object> extends Config<Type> {
    protected file: File;

    constructor(filePath: string, defaultConfig: Type = {} as Type) {
        const file = FileBuilder(filePath);
        let configuration = defaultConfig as Type;

        if (file.exists() && file.isReadWritable())
            configuration = file.read();

        super(configuration);

        this.file = file;
        this.set(configuration);
    }
    /**
     * Check if path exists
     * @returns true if path to config file exists
     */
    fileExist(): boolean {
        return this.file.exists();
    }
    isValid(): boolean {
        return super.isValid();
    }

    /**
     * Persistence hook invoked after every in-memory configuration mutation.
     * The default implementation writes directly to the target file, which
     * truncates it before the new content lands; subclasses that need to
     * guarantee concurrent readers never observe partial content may override
     * this hook with an atomic persistence strategy.
     */
    protected createIfNotExistAndWrite(value: any): boolean {
        if (!this.fileExist() && !this.file.create())
            return false;
        this.file.write(value);
        return true;
    }

    set(config: any): boolean {
        if (!super.set(config)) return false;
        return this.createIfNotExistAndWrite(this.configuration);
    }
    setEntry(key: keyof Type, value: any): boolean {
        if (!super.setEntry(key, value)) return false;
        return this.createIfNotExistAndWrite(this.configuration);
    }
    deleteEntry(key: keyof Type): boolean {
        if (!super.deleteEntry(key)) return false;
        return this.createIfNotExistAndWrite(this.configuration);
    }
}
