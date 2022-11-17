import { Validator } from "@scramjet/types";
import { isUrlPath } from "../typeguards";

export const urlPathValidator: Validator = (message: string) => (value: string) => !isUrlPath(value) ? message : true;
