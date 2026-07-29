export type RunnerLogForwardingConfig = {
    forwardRunnerLogs?: boolean;
};

/** Copy the optional forwarding setting into the private child boot contract. */
export function copyRunnerLogForwarding<T extends RunnerLogForwardingConfig>(target: T, source: RunnerLogForwardingConfig): T {
    if (source.forwardRunnerLogs !== undefined) target.forwardRunnerLogs = source.forwardRunnerLogs;
    return target;
}

/** Missing configuration preserves the historical enabled behavior. */
export function shouldForwardRunnerLogs(config: RunnerLogForwardingConfig): boolean {
    return config.forwardRunnerLogs !== false;
}
