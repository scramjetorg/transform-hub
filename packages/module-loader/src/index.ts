import { ObjLogger } from "@scramjet/obj-logger";
import { ModuleLoaderOpts } from "@scramjet/types";

export const logger = new ObjLogger("ModuleLoader");
export async function loadModule(opts: ModuleLoaderOpts): Promise<any> {
    logger.info("Loading module", opts.name);

    if (!opts.name) {
        throw new Error("Name missing");
    }

    let module: ClassDecorator | null;

    const heap = process.memoryUsage().heapUsed;

    try {
        module = await import(opts.name);

        logger.debug("Memory diff after module load", heap - process.memoryUsage().heapUsed);

        return module!;
    } catch (e) {
        logger.error(`Error loading module ${name}`);

        throw new Error(`Error loading module ${name}`);
    }
}

