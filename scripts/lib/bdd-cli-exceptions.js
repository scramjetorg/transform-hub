const E2E003_KILL_EXCEPTION = {
    featureUri: "e2e/E2E-003-kill.feature",
    line: 4,
    scenarioName: "E2E-003 TC-003 API test - Kill instance when it's not responding",
    allowanceBytes: 225280,
    reason: "Stable guarded post-cleanup samples 745144, 742744, 743048, 746888, 746056, "
        + "and 745632 bytes; the one-4KiB adjustment to 225280 additive bytes yields "
        + "the 749568-byte effective limit "
        + "over the strict 524288-byte parent guard.",
};

module.exports = { E2E003_KILL_EXCEPTION };
