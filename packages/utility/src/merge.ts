import { DeepPartial } from "@scramjet/types";

export const merge = <T extends Record<string, unknown>>(objTo: T, objFrom: DeepPartial<T> = {}) => Object.keys(objFrom)
    .forEach((key: keyof T) => {
        if (typeof objFrom[key] === "object" && !Array.isArray(objFrom[key])) {
            merge(objTo[key] as Record<string, unknown>, objFrom[key]!);
        } else if (objFrom[key]) {
            objTo[key] = objFrom[key] as T[keyof T];
        }
    });
