"use strict";

const MAX_RECORDS = 40;
const MAX_NAMES = 8;
const SAFE_ERROR_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EPIPE", "EHOSTUNREACH", "ENOTFOUND", "ECONNABORTED"]);
const SAFE_CLIENT_CODES = new Set(["GENERAL_ERROR", "BAD_PARAMETERS", "NEED_AUTHENTICATION", "NOT_AUTHORIZED", "NOT_FOUND", "GONE", "SERVER_ERROR", "REQUEST_ERROR", "UNKNOWN_ERROR", "CANNOT_CONNECT", "INVALID_RESPONSE", "INSUFFICIENT_RESOURCES", "UNPROCESSABLE_ENTITY"]);
const SAFE_ENDPOINTS = new Set(["version", "list", "all_sequences", "instances", "Manager stop", "Manager start", "MultiManager process"]);
const FIELD_NAMES = new Set([
    "managerId", "oldMultiManagerPid", "newMultiManagerPid", "multiManagerPid", "operation", "lastCompletedOperation", "endpoint",
    "unmetCondition", "endpointOutcome", "processes", "unexpectedExits", "expectedHubCount", "expectedHubNames",
    "observedHubs", "sequenceCount", "instanceCount", "attempts", "waitElapsedMs", "lastHttpStatus", "lastTransportErrorCode", "lastClientErrorCode",
]);

function safeText(value, fallback = "unknown") {
    const text = String(value ?? fallback).replace(/[\x00-\x1f\x7f]/g, " ").replace(/::/g, "__").slice(0, 120);
    return text || fallback;
}

function safePid(value) {
    const pid = Number(value);
    return Number.isSafeInteger(pid) && pid > 0 ? pid : null;
}

function safeName(value) {
    return safeText(value).slice(0, 48);
}

function safeCode(error) {
    return safeEndpointOutcome(error).transportCode || safeEndpointOutcome(error).clientCode || (error ? "OTHER" : null);
}

function statusValue(value) {
    if (Number.isInteger(value) && value >= 100 && value <= 599) return value;
    if (typeof value === "string" && /^\d{3}$/.test(value)) {
        const status = Number(value);
        return status >= 100 && status <= 599 ? status : null;
    }
    return null;
}

function safeEndpointName(value) {
    return SAFE_ENDPOINTS.has(value) ? value : "Manager API";
}

function safeEndpointOutcome(error, fallback = {}) {
    if (error?.managerEndpointOutcome) fallback = error.managerEndpointOutcome;
    const sources = [];
    let current = error;
    for (let depth = 0; current && depth < 4; depth++) {
        sources.push(current);
        current = current.reason || current.cause;
    }
    const status = sources.map(source => statusValue(source.status ?? source.response?.status)).find(value => value !== null) ?? statusValue(fallback.status);
    const clientCode = sources.map(source => source.code).find(code => SAFE_CLIENT_CODES.has(code)) || (SAFE_CLIENT_CODES.has(fallback.clientCode) ? fallback.clientCode : null);
    const transportCode = sources.flatMap(source => [source.code, source.status]).find(code => SAFE_ERROR_CODES.has(code)) ||
        (SAFE_ERROR_CODES.has(fallback.transportCode) ? fallback.transportCode : null);
    return { status, clientCode, transportCode };
}

function readinessTimeoutError(endpoint, lastError, responded = false) {
    const error = new Error(responded ? "Timed out waiting for the Manager API to stop responding." : "Timed out waiting for the Manager API endpoint to become ready.");
    error.managerEndpointName = safeEndpointName(endpoint);
    error.managerEndpointOutcome = responded ? { status: 200 } : safeEndpointOutcome(lastError);
    return error;
}

function processState(role, name, child) {
    const pid = safePid(child?.pid);
    let alive = false;
    if (pid) {
        try { process.kill(pid, 0); alive = true; } catch (error) { alive = error?.code === "EPERM"; }
    }
    return {
        role: safeName(role),
        name: safeName(name),
        pid,
        exitCode: Number.isInteger(child?.exitCode) ? child.exitCode : null,
        signal: typeof child?.signalCode === "string" ? safeText(child.signalCode) : null,
        alive,
    };
}

function createManagerLifecycleLog({ world, write = line => process.stderr.write(`${line}\n`), now = Date.now } = {}) {
    const startedAt = now();
    const resources = world?.resources || {};
    const records = resources.managerLifecycleRecords || (resources.managerLifecycleRecords = []);
    let restartCount = resources.managerRestartCount || 0;
    let lastCompletedOperation = "none";

    const scenario = safeText(resources.managerLifecycleScenario || world?.pickle?.name || world?.testCaseStartedId || "unknown scenario");
    const runId = safeText(process.env.SCRAMJET_BDD_RUN_ID || "unknown");
    const chunkId = safeText(process.env.SCRAMJET_BDD_CHUNK_ID || "unknown");

    const safeFields = fields => {
        const result = {};
        let omittedDiagnosticsCount = 0;
        for (const [key, value] of Object.entries(fields)) {
            if (!FIELD_NAMES.has(key)) continue;
            if (key === "endpointOutcome") {
                const outcome = safeEndpointOutcome(value?.error, {
                    status: value?.status,
                    clientCode: value?.clientCode ?? value?.errorCode,
                    transportCode: value?.transportCode,
                });
                result[key] = {
                    status: outcome.status,
                    clientCode: outcome.clientCode,
                    transportCode: outcome.transportCode,
                };
            } else if (key === "processes") {
                omittedDiagnosticsCount += Math.max(0, value.length - MAX_NAMES);
                result[key] = value.slice(0, MAX_NAMES).map(item => processState(item.role, item.name, item.child));
            } else if (key === "unexpectedExits") {
                omittedDiagnosticsCount += Math.max(0, value.length - MAX_NAMES);
                result[key] = value.slice(0, MAX_NAMES).map(item => ({
                    role: safeName(item.role), pid: safePid(item.pid),
                    exitCode: Number.isInteger(item.exitCode) ? item.exitCode : null,
                    signal: item.signal ? safeName(item.signal) : null,
                }));
            } else if (key === "expectedHubNames") {
                omittedDiagnosticsCount += Math.max(0, value.length - MAX_NAMES);
                result[key] = value.slice(0, MAX_NAMES).map(safeName);
            } else if (key === "observedHubs") {
                omittedDiagnosticsCount += Math.max(0, value.length - MAX_NAMES);
                result[key] = value.slice(0, MAX_NAMES).map(hub => ({
                    id: safeName(hub.id), name: safeName(hub.name), pid: safePid(hub.pid), active: hub.active === true,
                }));
            } else if (["oldMultiManagerPid", "newMultiManagerPid", "multiManagerPid"].includes(key)) {
                result[key] = safePid(value);
            } else if (["expectedHubCount", "sequenceCount", "instanceCount", "attempts", "waitElapsedMs", "lastHttpStatus"].includes(key)) {
                result[key] = Number.isSafeInteger(value) && value >= 0 ? value : (value === "NOT QUERIED" ? value : null);
            } else if (key === "lastTransportErrorCode") {
                result[key] = SAFE_ERROR_CODES.has(value) ? value : value ? "OTHER" : null;
            } else if (key === "lastClientErrorCode") {
                result[key] = SAFE_CLIENT_CODES.has(value) ? value : value ? "OTHER" : null;
            } else if (key === "endpoint") {
                result[key] = safeEndpointName(value);
            } else {
                result[key] = safeText(value);
            }
        }
        return { fields: result, omittedDiagnosticsCount };
    };

    const emit = (message, fields = {}) => {
        const safe = safeFields(fields);
        const record = {
            message: safeName(message),
            scenario,
            runId,
            chunkId,
            elapsedMs: Math.max(0, now() - startedAt),
            restartCount,
            noRestartYet: restartCount === 0,
            ...safe.fields,
            omittedDiagnosticsCount: safe.omittedDiagnosticsCount,
        };
        records.push(record);
        if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
        try {
            let line = `[Manager lifecycle] ${JSON.stringify(record)}`;
            if (line.length > 3500) {
                const compact = {
                    ...record,
                    processes: record.processes?.slice(0, 3),
                    unexpectedExits: record.unexpectedExits?.slice(0, 3),
                    expectedHubNames: record.expectedHubNames?.slice(0, 3),
                    observedHubs: record.observedHubs?.slice(0, 3),
                };
                compact.omittedDiagnosticsCount += (record.processes?.length || 0) - (compact.processes?.length || 0) +
                    (record.unexpectedExits?.length || 0) - (compact.unexpectedExits?.length || 0) +
                    (record.expectedHubNames?.length || 0) - (compact.expectedHubNames?.length || 0) +
                    (record.observedHubs?.length || 0) - (compact.observedHubs?.length || 0);
                line = `[Manager lifecycle] ${JSON.stringify(compact)}`;
            }
            write(line);
        } catch { /* diagnostics must never replace the scenario result */ }
        return record;
    };

    const markComplete = operation => { lastCompletedOperation = safeText(operation); };

    const snapshot = ({ operation, managerId, unmetCondition, endpoint, endpointOutcome, processes = [], lifecycle, registration } = {}) => {
        let unexpected = [];
        try {
            unexpected = (lifecycle?.unexpectedExitRecords?.() || []).map(record => ({
                role: safeText(record.label),
                pid: safePid(record.pid),
                exitCode: Number.isInteger(record.exitCode) ? record.exitCode : null,
                signal: typeof record.exitSignal === "string" ? safeText(record.exitSignal) : null,
            }));
        } catch { /* best-effort diagnostic snapshot */ }
        emit("Manager lifecycle failure snapshot", {
            operation: safeText(operation),
            managerId: safeName(managerId),
            lastCompletedOperation,
            endpoint: safeEndpointName(endpoint),
            unmetCondition: safeText(unmetCondition),
            endpointOutcome: endpointOutcome || { status: null, errorCode: null },
            processes,
            unexpectedExits: lifecycle ? unexpected : [],
            ...(registration ? {
                expectedHubCount: registration.expectedHubCount ?? registration.expectedHubNames.length,
                expectedHubNames: registration.expectedHubNames,
                observedHubs: registration.observedHubs,
                sequenceCount: registration.sequenceCount,
                instanceCount: registration.instanceCount,
                attempts: registration.attempts,
                waitElapsedMs: registration.elapsedMs,
                lastHttpStatus: registration.lastHttpStatus,
                lastTransportErrorCode: registration.lastTransportErrorCode,
                lastClientErrorCode: registration.lastClientErrorCode,
            } : {}),
        });
    };

    const methods = {
        emit,
        markComplete,
        restartRequested(target, managerId, oldPid) {
            restartCount++;
            resources.managerRestartCount = restartCount;
            emit(`${safeName(target)} restart requested`, {
                managerId: safeName(managerId),
                ...(target === "MultiManager" ? { oldMultiManagerPid: safePid(oldPid) } : { multiManagerPid: safePid(oldPid) }),
            });
        },
        stopped(target, managerId, oldPid) {
            emit(`${safeName(target)} stopped`, {
                managerId: safeName(managerId),
                ...(target === "MultiManager" ? { oldMultiManagerPid: safePid(oldPid) } : { multiManagerPid: safePid(oldPid) }),
            });
            markComplete(`${target} stopped`);
        },
        apiReady(managerId, newPid) {
            emit("MultiManager API ready", { managerId: safeName(managerId), newMultiManagerPid: safePid(newPid) });
            markComplete("MultiManager API ready");
        },
        managerStarted(managerId, mmPid) {
            emit("Manager start accepted", { managerId: safeName(managerId), multiManagerPid: safePid(mmPid) });
            markComplete("Manager start accepted");
        },
        waitingForHubs(managerId, expectedNames, expectedCount = expectedNames.length) {
            const names = expectedNames.slice(0, MAX_NAMES).map(safeName);
            emit("Waiting for Hub registration", { managerId: safeName(managerId), expectedHubCount: expectedCount, expectedHubNames: names });
            return { startedAt: now(), attempts: 0, expectedHubCount: expectedCount, expectedHubNames: names };
        },
        hubRegistrationComplete(managerId, wait, result) {
            emit("Hub registration complete", {
                managerId: safeName(managerId),
                expectedHubCount: wait.expectedHubCount,
                expectedHubNames: wait.expectedHubNames,
                observedHubs: result.observedHubs || [],
                sequenceCount: Number.isFinite(result.sequenceCount) ? result.sequenceCount : "NOT QUERIED",
                instanceCount: Number.isFinite(result.instanceCount) ? result.instanceCount : "NOT QUERIED",
                attempts: wait.attempts,
                waitElapsedMs: Math.max(0, now() - wait.startedAt),
                lastHttpStatus: Number.isInteger(result.lastHttpStatus) ? result.lastHttpStatus : null,
                lastTransportErrorCode: result.lastTransportErrorCode || null,
                lastClientErrorCode: result.lastClientErrorCode || null,
                unmetCondition: "none",
            });
            markComplete("Hub registration complete");
        },
        get lastCompletedOperation() { return lastCompletedOperation; },
    };
    methods.failure = snapshot;
    return methods;
}

module.exports = { createManagerLifecycleLog, processState, safeText, safePid, safeCode, safeEndpointOutcome, safeEndpointName, readinessTimeoutError };
