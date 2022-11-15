import { Validator } from "@scramjet/types";
import { isDefined, isEmptyString } from "../typeguards";

export const definedValidator: Validator = (message: string) => (value: any) =>
    isDefined(value) && !isEmptyString(value) ? true : message;
