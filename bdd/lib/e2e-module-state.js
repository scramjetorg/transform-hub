let lastTerminalStopDiagnostics;

function setLastTerminalStopDiagnostics(diagnostics) {
    lastTerminalStopDiagnostics = diagnostics;
}

function getLastTerminalStopDiagnostics() {
    return lastTerminalStopDiagnostics;
}

function clearLastTerminalStopDiagnostics() {
    lastTerminalStopDiagnostics = undefined;
}

function clearE2eScenarioState(resources, state) {
    const ownedClient = resources.hostClient === state.scenarioHostClient ? state.scenarioHostClient : undefined;
    // Keep the pre-baseline scenario client alive across ordinary scenarios in
    // a feature/chunk. The tagged E2E-003 scenario may execute after earlier
    // scenarios; clear it only after that client was actually used/owned.
    if (ownedClient) state.scenarioHostClient = undefined;
    resources.hostClient = undefined;
    ownedClient?.dispose?.();
    state.runnerEnded = Promise.resolve();
    state.signalRunnerEnded = () => undefined;
    clearLastTerminalStopDiagnostics();
    return state;
}

module.exports = { clearE2eScenarioState, setLastTerminalStopDiagnostics, getLastTerminalStopDiagnostics, clearLastTerminalStopDiagnostics };
