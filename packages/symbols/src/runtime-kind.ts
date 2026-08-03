/** Supported runtime kinds for sequence execution. */
export type RuntimeKind = "node" | "python3" | "bun";

/**
 * Selects the runtime kind from package engines with explicit node precedence.
 */
export function selectRuntimeKind(engines?: Record<string, string>): RuntimeKind {
    if (engines && "node" in engines) return "node";
    if (engines && "bun" in engines) return "bun";
    if (engines && "python3" in engines) return "python3";
    return "node";
}
