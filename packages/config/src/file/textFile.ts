import { accessSync, constants, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { basename, dirname, extname } from "path";
import { File } from "../types/file";

export class TextFile implements File {
    public readonly path: string;

    constructor(path: string) {
        this.path = path;
    }

    write(value: any) { return writeFileSync(this.path, value, "utf-8"); }
    read() { return readFileSync(this.path, "utf-8"); }

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

