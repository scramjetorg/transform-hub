import { Validator } from "@scramjet/runtime-types";
import { isPort } from "../typeguards";

export const portValidator: Validator = (message: string) => (value: string) => !isPort(value) ? message : true;
