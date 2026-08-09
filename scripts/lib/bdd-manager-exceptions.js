const MANAGER_PARENT_ALLOWANCE_BYTES = 2 * 1024 * 1024;
const MANAGER_APPROVAL_REASON =
    "User-approved exact 2 MiB parent-heap allowance for Manager BDD strict-memory work; " +
    "the measured scenario spans a multi-process Manager/MultiManager/Hub topology and " +
    "retains lifecycle allocations after owned client/process disposal and GC.";

/** Explicit Manager feature scope; child RSS/container limits remain independent. */
const MANAGER_SCENARIO_EXCEPTIONS = Object.freeze([
    Object.freeze({
        featureUri: "manager/MANAGER-002-aggregation-repro.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: MANAGER_PARENT_ALLOWANCE_BYTES,
        reason: MANAGER_APPROVAL_REASON
    }),
    Object.freeze({
        featureUri: "manager/MANAGER-003-full-api-verser2-forwarding.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: MANAGER_PARENT_ALLOWANCE_BYTES,
        reason: MANAGER_APPROVAL_REASON
    }),
    Object.freeze({
        featureUri: "manager/MANAGER-004-topic-forwarding.feature",
        line: 0,
        scenarioName: "*",
        allowanceBytes: MANAGER_PARENT_ALLOWANCE_BYTES,
        reason: MANAGER_APPROVAL_REASON
    })
]);

module.exports = {
    MANAGER_PARENT_ALLOWANCE_BYTES,
    MANAGER_APPROVAL_REASON,
    MANAGER_SCENARIO_EXCEPTIONS
};
