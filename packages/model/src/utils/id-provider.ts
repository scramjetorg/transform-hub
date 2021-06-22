import { v4 as uuidv4, validate } from "uuid";

export class IDProvider {
    static generate() {
        return uuidv4();
    }

    public static isValid(id: string) {
        return validate(id);
    }
}

