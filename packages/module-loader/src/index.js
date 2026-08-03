const { ObjLogger } = require("@scramjet/obj-logger");

const logger = new ObjLogger("ModuleLoader");
exports.logger = logger;
exports.loadModule = async function loadModule(opts) {
    logger.info("Loading module", opts.name);

    if (!opts.name) {
        throw new Error("Name missing");
    }

    let mod;

    const heap = process.memoryUsage().heapUsed;

    try {
        if (!opts.mode || opts.mode === "import") {
            mod = await import(opts.name);
        } else if (opts.mode === "require") {
            mod = module.require(opts.name);
        } else {
            throw new Error("Invalid mode");
        }

        logger.debug("Memory diff after module load", process.memoryUsage().heapUsed - heap);

        return mod;
    } catch (e) {
        logger.error(`Error loading module ${opts.name}`);

        throw new Error(`Error loading module ${opts.name}, ${e?.stack}`);
    }
}