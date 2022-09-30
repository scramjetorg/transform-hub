import { extname } from "path";
import { TextFile } from "./textFile";
import { JsonFile } from "./jsonFile";
import { YamlFile } from "./yamlFile";
import { File } from "../types/file";

export const FileBuilder = (path: string): File => {
    switch (extname(path)) {
        case ".json":
            return new JsonFile(path);
        case ".yaml":
        case ".yml":
            return new YamlFile(path);
        default:
            return new TextFile(path);
    }
};
