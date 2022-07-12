import { join, resolve } from "path";
import { existsSync, readFileSync } from "fs";

export const readJsonFile = (fileNameCandidate: string, ...path: string[]): {[key: string]: any} => {
    const fileName = fileNameCandidate.endsWith(".json") ? fileNameCandidate : `${fileNameCandidate}.json`;
    const filePath = join(...path, fileName);
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
