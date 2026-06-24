import { Validator } from "@scramjet/runtime-types";
import { isLogLevel } from "../typeguards";

export const logLevelValidator: Validator = (message: string) => (value: string) => !isLogLevel(value) ? message : true;
