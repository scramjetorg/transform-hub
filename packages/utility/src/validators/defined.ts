import { Validator } from "@scramjet/types";
import { isDefined } from "../typeguards";

export const definedValidator: Validator = (message: string) => (value: any) => !isDefined(value) ? message : true;
