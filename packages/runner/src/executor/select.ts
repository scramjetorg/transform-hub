import { RuntimeExecutor } from "@scramjet/runtime-types";
import { selectRuntimeKind } from "@scramjet/symbols";
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
    switch (selectRuntimeKind(config.engines)) {
        case "bun":
            return bunExecutor;
        case "python3":
            return pythonExecutor;
        default:
            return nodeExecutor;
    }
}
