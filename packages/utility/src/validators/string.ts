import { Validator } from "@scramjet/runtime-types";

export const stringValidator: Validator = (message: string) => (value: any) =>
    !(typeof value === "string") ? message : true;
