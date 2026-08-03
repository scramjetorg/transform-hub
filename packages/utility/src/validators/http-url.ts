import { Validator } from "@scramjet/runtime-types";
import { isHttpUrl } from "../typeguards";

export const httpUrlValidator: Validator = (message: string) => (value: string) => !isHttpUrl(value) ? message : true;
