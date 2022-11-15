import { isDefined, isEmptyString } from "../typeguards";

export const optionalValidator = (value: any) => isDefined(value) && !isEmptyString(value);
