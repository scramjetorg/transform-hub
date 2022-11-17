import { Validator } from "@scramjet/types";
import { isHttpUrl } from "../typeguards";

export const httpUrlValidator: Validator = (message: string) => (value: string) => !isHttpUrl(value) ? message : true;
