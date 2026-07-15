function clearE2eScenarioState(resources, state) {
    const ownedClient = resources.hostClient === state.scenarioHostClient ? state.scenarioHostClient : undefined;
    state.scenarioHostClient = undefined;
    resources.hostClient = undefined;
    ownedClient?.dispose?.();
    state.runnerEnded = Promise.resolve();
    state.signalRunnerEnded = () => undefined;
    return state;
}

module.exports = { clearE2eScenarioState };
