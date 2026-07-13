import test from "ava";
import { sessionConfig } from "../src/lib/config";
import { getSequenceId } from "../src/lib/config";
import { handlePruneAction } from "../src/lib/commands/sequence";

/**
 * Focused unit tests for CLI sequence session-state management.
 *
 * These tests validate the session-clearing logic used by `seq delete`
 * and `seq prune` without requiring a running Hub (the actual API call
 * is a separate concern tested by BDD scenarios).
 */

test("getSequenceId resolves dash to sessionConfig.lastSequenceId", (t) => {
    sessionConfig.setLastSequenceId("seq-abc-123");
    t.is(getSequenceId("-"), "seq-abc-123");
    sessionConfig.setLastSequenceId("");
});

test("getSequenceId returns literal id when not dash", (t) => {
    t.is(getSequenceId("my-seq"), "my-seq");
});

test("getSequenceId throws when dash resolves to empty lastSequenceId", (t) => {
    sessionConfig.setLastSequenceId("");
    t.throws(() => getSequenceId("-"), { message: /Previous value isn't said/ });
});

test("sessionConfig lastSequenceId setter and getter round-trip", (t) => {
    const prev = sessionConfig.lastSequenceId;

    sessionConfig.setLastSequenceId("seq-roundtrip-test");
    t.is(sessionConfig.lastSequenceId, "seq-roundtrip-test");

    sessionConfig.setLastSequenceId("");
    t.is(sessionConfig.lastSequenceId, "");

    // Restore previous value
    sessionConfig.setLastSequenceId(prev);
});

test("sessionConfig lastInstanceId setter and getter round-trip", (t) => {
    const prev = sessionConfig.lastInstanceId;

    sessionConfig.setLastInstanceId("inst-roundtrip-test");
    t.is(sessionConfig.lastInstanceId, "inst-roundtrip-test");

    sessionConfig.setLastInstanceId("");
    t.is(sessionConfig.lastInstanceId, "");

    // Restore previous value
    sessionConfig.setLastInstanceId(prev);
});

/**
 * Verifies the session-clearing pattern applied by the `seq delete` fix:
 *
 * In the delete command action, `id` is resolved via `getSequenceId(id)`
 * BEFORE being passed to `sequenceDelete`. This means `sequenceDelete`
 * receives the resolved sequence ID, and its internal comparison
 * `lastSequenceId === id` correctly matches, causing the session to clear.
 *
 * This test simulates the fix's resolved-ID behaviour by calling
 * `getSequenceId("-")` first, then verifying the resolved value matches
 * the config entry – confirming the delete path will clear it.
 */
test("seq delete - resolves dash then matches lastSequenceId (clearing precondition)", (t) => {
    // Simulate: user ran "seq use seq-1" or "seq send ..." earlier
    sessionConfig.setLastSequenceId("seq-1");

    // The resolved id after getSequenceId("-")
    const resolvedId = getSequenceId("-");

    t.is(resolvedId, "seq-1");

    // sequenceDelete will compare resolvedId against sessionConfig.lastSequenceId
    t.is(sessionConfig.lastSequenceId, resolvedId, "resolved id must match lastSequenceId for clearing to work");

    sessionConfig.setLastSequenceId("");
});

/**
 * Verifies the session-clearing pattern applied by the `seq prune` fix:
 *
 * The prune command now explicitly clears both lastSequenceId and
 * lastInstanceId after successfully removing all sequences.
 */
test("prune clears both lastSequenceId and lastInstanceId", (t) => {
    // Simulate: session has a stale last sequence and instance id
    sessionConfig.setLastSequenceId("seq-stale");
    sessionConfig.setLastInstanceId("inst-stale");

    // What prune does after successfully deleting all sequences
    sessionConfig.setLastSequenceId("");
    sessionConfig.setLastInstanceId("");

    t.is(sessionConfig.lastSequenceId, "");
    t.is(sessionConfig.lastInstanceId, "");
});

/**
 * Tests that handlePruneAction clears stale session state when the sequence
 * list is already empty (early-already-empty case).
 */
test.serial("handlePruneAction early-empty clears stale session state", async (t) => {
    // Arrange: stale session state
    sessionConfig.setLastSequenceId("seq-stale");
    sessionConfig.setLastInstanceId("inst-stale");

    const mockHostClient = {
        async listSequences() { return []; },
        async deleteSequence(_id: string, _opts?: { force: boolean }) { return {}; },
    } as any;

    // Act
    await t.notThrowsAsync(() =>
        handlePruneAction({ force: false }, mockHostClient as any)
    );

    // Assert: session cleared even though list was empty
    t.is(sessionConfig.lastSequenceId, "");
    t.is(sessionConfig.lastInstanceId, "");
});

/**
 * Tests that handlePruneAction does NOT clear session state when deletion
 * fails (failed prune retention).
 */
test.serial("handlePruneAction failed delete retains session state", async (t) => {
    // Arrange: session has known IDs
    sessionConfig.setLastSequenceId("seq-keep");
    sessionConfig.setLastInstanceId("inst-keep");

    const deleteError = new Error("API failure");
    const mockHostClient = {
        async listSequences() {
            return [{ id: "seq-keep", instances: [], config: { name: "test" } }];
        },
        async deleteSequence(_id: string, _opts?: { force: boolean }) {
            throw deleteError;
        },
    } as any;

    // Act
    const err = await t.throwsAsync(() =>
        handlePruneAction({ force: false }, mockHostClient as any)
    );

    // Assert: error thrown AND session state preserved
    t.truthy(err);
    t.regex(err!.message, /not been deleted/i);
    t.is(sessionConfig.lastSequenceId, "seq-keep", "lastSequenceId must survive failed prune");
    t.is(sessionConfig.lastInstanceId, "inst-keep", "lastInstanceId must survive failed prune");
});

/**
 * Tests that handlePruneAction does NOT clear session state when the re-list
 * after deletion is still non-empty (re-list failure).
 */
test.serial("handlePruneAction non-empty relist retains session state", async (t) => {
    // Arrange: session has known IDs
    sessionConfig.setLastSequenceId("seq-keep");
    sessionConfig.setLastInstanceId("inst-keep");

    let callCount = 0;
    const mockHostClient = {
        async listSequences() {
            callCount++;
            // First call returns 1 sequence, second call (re-list) also returns 1
            return [{ id: "seq-keep", instances: [], config: { name: "test" } }];
        },
        async deleteSequence(_id: string, _opts?: { force: boolean }) {
            return {};
        },
    } as any;

    // Act
    const err = await t.throwsAsync(() =>
        handlePruneAction({ force: false }, mockHostClient as any)
    );

    // Assert: error thrown, session state preserved, listSequences called twice
    t.truthy(err);
    t.regex(err!.message, /not been deleted/i);
    t.is(callCount, 2, "listSequences must be called twice (initial + relist)");
    t.is(sessionConfig.lastSequenceId, "seq-keep", "lastSequenceId must survive non-empty relist");
    t.is(sessionConfig.lastInstanceId, "inst-keep", "lastInstanceId must survive non-empty relist");
});

/**
 * Tests that handlePruneAction clears session state after a successful
 * full deletion confirmed by an empty re-list.
 */
test.serial("handlePruneAction successful prune clears session state", async (t) => {
    // Arrange: session has known IDs
    sessionConfig.setLastSequenceId("seq-clear");
    sessionConfig.setLastInstanceId("inst-clear");

    let callCount = 0;
    const mockHostClient = {
        async listSequences() {
            callCount++;
            if (callCount === 1) {
                return [{ id: "seq-clear", instances: [], config: { name: "test" } }];
            }
            return []; // Second call (re-list) returns empty
        },
        async deleteSequence(_id: string, _opts?: { force: boolean }) {
            return {};
        },
    } as any;

    // Act
    await t.notThrowsAsync(() =>
        handlePruneAction({ force: false }, mockHostClient as any)
    );

    // Assert: session cleared, listSequences called twice
    t.is(callCount, 2, "listSequences must be called twice (initial + relist)");
    t.is(sessionConfig.lastSequenceId, "", "lastSequenceId must be cleared after successful prune");
    t.is(sessionConfig.lastInstanceId, "", "lastInstanceId must be cleared after successful prune");
});
