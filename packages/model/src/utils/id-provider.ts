import * as uuidv4 from "uuid";

export class IDProvider {
    static generate() {
        return uuidv4.v4();
    }

    public static isValid(id: string) {
        return uuidv4.validate(id);
    }
}
