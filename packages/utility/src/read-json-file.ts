import { join, resolve } from "path";
import { existsSync, readFileSync } from "fs";

export const readJsonFile = (fileName: string, ...path: string[]): {[key: string]: any} => {
    const filePath = join(...path, `${fileName}.json`);
    const realPath = resolve(filePath);

    let data = {};

    try {
        if (existsSync(realPath)) {
            data = JSON.parse(readFileSync(realPath, "utf8"));
        }
    } catch (err) {
        // Ignore.
    } finally {
        return data;
    }
};
