import { TextFile } from "./textFile";

export class JsonFile extends TextFile {
    write(value: any) {
        return super.write(JSON.stringify(value, null, 2));
    }
    read() {
        return JSON.parse(super.read());
    }
}
