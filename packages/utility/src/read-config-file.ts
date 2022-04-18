import { readFile } from "fs/promises";

export async function readConfigFile(filename: string) {
    const configString = await readFile(filename, "utf-8");

    return JSON.parse(configString);
}
