import { join, resolve } from "path";
import { JsonFile } from "./file";

export const readJsonFile = (fileNameCandidate: string, ...path: string[]): { [key: string]: any } => {
    const fileName = fileNameCandidate.endsWith(".json") ? fileNameCandidate : `${fileNameCandidate}.json`;
    const filePath = join(...path, fileName);
    const realPath = resolve(filePath);

    let data = {};

    try {
        const jsonFile = new JsonFile(realPath);

        if (jsonFile.exists() && jsonFile.isReadable())
            data = jsonFile.read();
    } catch (err) {
        // Ignore.
    } finally {
        return data;
    }
};
