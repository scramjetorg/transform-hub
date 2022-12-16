import { createHash } from "crypto";
import { v4 as uuidv4, validate } from "uuid";

export class IDProvider {
    static generate(...args: string[]) {
        const random = !args.length
            ? undefined
            : createHash("sha256").update(Buffer.from(args.join("."))).digest();

        return uuidv4({ random });
    }

    public static isValid(id: string) {
        return validate(id);
    }
}
