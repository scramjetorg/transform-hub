import { Validator } from "@scramjet/types";
import { FileBuilder } from "../file";

export const fileExistsValidator: Validator = (message: string) => (value: any) => {
    if (typeof value !== "string") return message;

    const file = FileBuilder(value);

    return !file.exists() || !file.isReadable() ? message : true;
};
