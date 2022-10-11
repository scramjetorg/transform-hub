import YAML from "yaml";
import { TextFile } from "./textFile";

export class YamlFile extends TextFile {
    write(value: any) {
        return super.write(YAML.stringify(value));
    }
    read() {
        return YAML.parse(super.read());
    }
}
