import { Validator } from "@scramjet/types";
import { isDefined } from "../typeguards";

export const optionalValidator: Validator = () => (value: any) => isDefined(value);
