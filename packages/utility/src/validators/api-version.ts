import { Validator } from "@scramjet/types";
import { isApiVersion } from "../typeguards";

export const apiVersionValidator: Validator = (message: string) => (version: string) =>
    !isApiVersion(version) ? message : true;
