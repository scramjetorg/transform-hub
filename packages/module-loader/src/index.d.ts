import { ObjLogger } from "@scramjet/obj-logger";
import { ModuleLoaderOpts } from "@scramjet/types";
export declare const logger: ObjLogger;
export declare function loadModule<T>(opts: ModuleLoaderOpts): Promise<T>;
