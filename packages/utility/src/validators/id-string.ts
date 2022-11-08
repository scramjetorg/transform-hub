import { Validator } from "@scramjet/types";
import { isIdString } from "../typeguards";

export const idStringValidator: Validator = (message: string) => (value: string) => !isIdString(value) ? message : true;
