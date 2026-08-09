import { Validator } from "@scramjet/runtime-types";
import { isBoolean } from "../typeguards/is-boolean";

export const booleanValidator: Validator = (message: string) => (value: any) => !isBoolean(value) ? message : true;
