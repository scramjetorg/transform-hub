import { accessSync, constants, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { basename, dirname, extname } from "path";
import YAML from "yaml";

export class File {
    public readonly path: string;
    public read: () => Object | string;
    public write: (value: any)=> boolean;

    constructor(path: string) {
        this.path = path;
        switch (this.extname()) {
            case ".json":
                this.write = (value: any) => { writeFileSync(this.path, JSON.stringify(value, null, 2), "utf-8"); return true; };
                this.read = () => JSON.parse(readFileSync(this.path, "utf-8"));
                break;
            case ".yaml":
            case ".yml":
                this.write = (value: any) => { writeFileSync(this.path, YAML.stringify(value), "utf-8"); return true; };
                this.read = () => YAML.parse(readFileSync(this.path, "utf-8"));
                break;
            default:
                this.write = (value: any) => { writeFileSync(this.path, value, "utf-8"); return true; };
                this.read = () => { return readFileSync(this.path, "utf-8"); };
                break;
        }
    }

    protected checkAccess(path: string, mode: number): boolean {
        try {
            return accessSync(path, mode) === undefined;
        } catch (_err) {
            return false;
        }
    }

    isReadable(): boolean {
        return this.checkAccess(this.path, constants.R_OK);
    }
    isReadWritable(): boolean {
        return this.checkAccess(this.path, constants.R_OK | constants.W_OK);
    }
    create(): boolean {
        if (mkdirSync(dirname(this.path), { recursive: true }) === undefined) {
            return false;
        }
        this.write("");
        return true;
    }
    remove() {
        rmSync(this.path);
    }
    exists(): boolean {
        return existsSync(this.path);
    }
    /**
     * @returns filename with extension
     */
    fullname(): string { return basename(this.path); }
    /**
     * @returns extension name
     */
    extname(): string { return extname(this.path); }
    /**
     * @returns filename without extension
     */
    name(): string { return basename(this.path, extname(this.path)); }
}

