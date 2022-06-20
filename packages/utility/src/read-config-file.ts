import { readFile } from "fs/promises";
import { parseDocument } from "yaml";

async function readJsonFile(filename: string) {
    const configString = await readFile(filename, "utf-8");

    return JSON.parse(configString);
}

async function readYmlFile(filename: string) {
    const configString = await readFile(filename, "utf-8");

    return parseDocument(configString);
}

export async function readConfigFile(filename: string): Promise<any> {
    if (filename.endsWith(".json")) return readJsonFile(filename);
    if (filename.endsWith(".yaml") || filename.endsWith(".yml"))
        return readYmlFile(filename);

    try {
        // await here on purpose, so try/catch works.
        return await readJsonFile(filename);
    } catch {
        return readYmlFile(filename);
    }
}
