import { Validator } from "@scramjet/types";
import { isBoolean } from "../typeguards/is-boolean";

export const booleanValidator: Validator = (message: string) => (value: any) => !isBoolean(value) ? message : true;
