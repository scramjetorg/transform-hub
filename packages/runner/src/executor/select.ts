import { RuntimeExecutor } from "@scramjet/types";
import { nodeExecutor } from "./node-process-executor";
import { pythonExecutor } from "./python-process-executor";
import { bunExecutor } from "./bun-process-executor";

/**
 * Select the appropriate RuntimeExecutor based on sequence config engines.
 *
 * @param config - Sequence configuration with optional engines field.
 * @returns A RuntimeExecutor instance for the requested runtime.
 */
export function selectExecutor(config: { engines?: Record<string, string> }): RuntimeExecutor {
    if (config.engines && "bun" in config.engines) {
        return bunExecutor;
    }

    if (config.engines && "python3" in config.engines) {
        return pythonExecutor;
    }

    // Default to Node executor for no engines or node engine.
    return nodeExecutor;
}
