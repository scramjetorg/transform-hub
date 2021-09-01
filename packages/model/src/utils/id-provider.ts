import * as uuidv4 from "uuid";

export class IDProvider {
    static generate() {
        return uuidv4.v4();
    }

    public static isValid(_id: string) {
        return true;//uuidv4.validate(id);
    }
}
