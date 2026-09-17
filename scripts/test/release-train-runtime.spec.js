"use strict";

const test = require("ava").default;
const { reconcileDevel, resetInitialize, startRelease } = require("../release-train-runtime");

const sha = (letter) => letter.repeat(40);
function adapters(lock = null) {
    const refs = { devel: sha("a"), main: sha("b") };
    if (lock) { refs[lock.releaseBranch] = lock.refs.R1; refs.devel = lock.currentCommit; }
    const writes = [];
    const alignments = [];
    const validations = [];
    const clears = [];
    return {
        refs,
        writes,
        alignments,
        validations,
        clears,
        git: {
            ref: (name) => refs[name],
            createRef: (name, value) => { refs[name] = value; },
            commit: (value) => ({ sha: value, parents: [sha("b"), sha("c")], tree: refs["release/2.0.0"] }),
            replay: ({ base, commits }) => sha("d"),
            backupRef: (name, value) => ({ name, value }),
            updateRef: (name, value, options) => { if (options.expected !== refs[name] && !(options.expected === sha("0") && refs[name] === undefined)) throw new Error("lease failed"); refs[name] = value; },
        },
        lockStore: { read: () => lock, readLive: () => lock, write: (value, options) => writes.push({ value, options }), clearResetState: (identity, state) => clears.push({ type: "lock", identity, state }) },
        reservation: { isReserved: () => false, reserve: () => {}, readMarker: () => lock ? ({ schema: "release-train-start.v1", repository: lock.repository, stableVersion: lock.stableVersion, nextDevelopmentVersion: lock.nextDevelopmentVersion, releaseBranch: lock.releaseBranch, anchor: lock.refs.D0 }) : null, clearResetState: (identity, state) => clears.push({ type: "marker", identity, state }) },
        github: { createPromotion: () => ({ number: 42 }), promotion: () => ({ number: 42, headSha: sha("c"), branch: "release/2.0.0", base: "main", repository: "scramjetorg/transform-hub" }) },
        align: {
            release: (options) => { alignments.push({ kind: "release", options }); refs[options.branch] = sha("c"); return sha("c"); },
            validateRelease: (options) => { validations.push(options); },
            development: (options) => { alignments.push({ kind: "development", options }); refs.devel = sha("e"); return sha("e"); }
        },
    };
}
function lock() {
    return { schema: "release-train-lock.v1", revision: 1, status: "active", branch: "devel", repository: "scramjetorg/transform-hub", stableVersion: "2.0.0", nextStableVersion: "2.1.0", nextDevelopmentVersion: "2.1.0-devel", releaseBranch: "release/2.0.0", refs: { D0: sha("a"), R1: sha("c"), main: sha("b") }, promotion: { number: 42, headSha: sha("c"), branch: "release/2.0.0", base: "main", repository: "scramjetorg/transform-hub" }, continuation: [sha("f")], currentCommit: sha("e") };
}

test("start rejects burned reservations before mutation and records exact PR identity", (t) => {
    const a = adapters();
    a.reservation.isReserved = () => true;
    t.throws(() => startRelease({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", adapters: a }), { message: /reserved/ });
    t.is(a.writes.length, 0);
    const b = adapters();
    const result = startRelease({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", adapters: b });
    t.is(result.promotion.number, 42);
    t.is(result.refs.D0, sha("a"));
    t.is(b.writes.length, 1);
    t.is(b.alignments[1].options.expected, sha("c"));
});

test("active retry reuses exact identity and changed retry fails closed", (t) => {
    const existing = lock();
    const a = adapters(existing);
    t.is(startRelease({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", adapters: a }), existing);
    t.throws(() => startRelease({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.2.0-devel", adapters: a }), { message: /identity/ });
});

test("active retry fails closed without live validation data", (t) => {
    const existing = lock();
    const a = adapters(existing);
    delete a.reservation.readMarker;
    delete a.github.promotion;
    t.throws(() => startRelease({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", adapters: a }), { message: /validated live/ });
});

test("reconciliation verifies exact merge, retains backup, replays in order, and terminalizes", (t) => {
    const a = adapters(lock());
    const result = reconcileDevel({ mergeSha: sha("b"), adapters: a });
    t.deepEqual(result.replay, [sha("f"), sha("e")]);
    t.is(result.lock.status, "reconciled");
    t.is(result.backup.value, sha("e"));
    t.is(a.writes[0].options.expected, 1);
});

test("merge conflicts and lease failures become durable manual recovery", (t) => {
    const conflict = adapters(lock());
    conflict.git.replay = () => { throw new Error("conflict"); };
    t.throws(() => reconcileDevel({ mergeSha: sha("b"), adapters: conflict }), { message: /manual recovery/ });
    t.is(conflict.writes[0].value.status, "manual-recovery-required");
    const lease = adapters(lock());
    lease.git.updateRef = () => { throw new Error("lease failed"); };
    t.throws(() => reconcileDevel({ mergeSha: sha("b"), adapters: lease }), { message: /manual recovery/ });
    t.is(lease.writes[0].value.status, "manual-recovery-required");
});

test("wrong merge parent or tree is rejected without writing the lock", (t) => {
    const a = adapters(lock());
    a.git.commit = () => ({ sha: sha("b"), parents: [sha("b"), sha("9")], tree: sha("8") });
    t.throws(() => reconcileDevel({ mergeSha: sha("b"), adapters: a }), { message: /exact admitted/ });
    t.is(a.writes.length, 0);
});

test("existing marker anchor is authoritative when devel has advanced", (t) => {
    const a = adapters();
    const marker = { schema: "release-train-start.v1", repository: "scramjetorg/transform-hub", stableVersion: "2.1.1", nextDevelopmentVersion: "2.1.2-devel", releaseBranch: "release/2.1.1", anchor: sha("9") };
    a.reservation.readMarker = () => marker;
    a.reservation.createMarker = () => t.fail("existing marker must not be recreated");
    const result = startRelease({ stableVersion: "2.1.1", nextDevelopmentVersion: "2.1.2-devel", adapters: a });
    t.is(result.refs.D0, marker.anchor);
    t.is(result.startMarker, marker);
    t.is(a.alignments[0].options.expected, marker.anchor);
});

test("wrong marker identity fails closed before mutation", (t) => {
    const a = adapters();
    a.reservation.readMarker = () => ({ schema: "release-train-start.v1", repository: "scramjetorg/transform-hub", stableVersion: "2.1.0", nextDevelopmentVersion: "2.1.1-devel", releaseBranch: "release/2.1.0", anchor: sha("9") });
    t.throws(() => startRelease({ stableVersion: "2.1.1", nextDevelopmentVersion: "2.1.2-devel", adapters: a }), { message: /identity/ });
    t.is(a.writes.length, 0);
    t.is(a.alignments.length, 0);
});

test("missing marker captures current devel as D0", (t) => {
    const a = adapters();
    a.refs.devel = sha("9");
    let stored;
    a.reservation.readMarker = () => stored || null;
    a.reservation.createMarker = (marker) => { stored = marker; };
    const result = startRelease({ stableVersion: "2.1.1", nextDevelopmentVersion: "2.1.2-devel", adapters: a });
    t.is(stored.anchor, sha("9"));
    t.is(result.refs.D0, sha("9"));
    t.is(result.startMarker.anchor, sha("9"));
});

test("reset-initialize requires exact confirmation and lower-case SHA", (t) => {
    const a = adapters();
    t.throws(() => resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("a"), confirmReset: "2.0.1", adapters: a }), { message: /exactly equal/ });
    t.throws(() => resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("A"), confirmReset: "2.0.0", adapters: a }), { message: /lower-case/ });
});

test("reset-initialize creates ordinary lock state in D0, R1, D1 order", (t) => {
    const a = adapters();
    const result = resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("a"), confirmReset: "2.0.0", adapters: a });
    t.deepEqual(result.refs, { D0: sha("a"), R1: sha("c"), D1: sha("e"), mainAtStart: sha("b") });
    t.false("startMarker" in result);
    t.false("currentCommit" in result);
    t.is(a.alignments[0].kind, "release");
    t.is(a.alignments[1].kind, "development");
});

test("reset-initialize rejects an active same-release train without clearing state", (t) => {
    const a = adapters(lock());
    t.throws(() => resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("e"), confirmReset: "2.0.0", adapters: a }), { message: /active same-release/ });
    t.is(a.clears.length, 0);
});

test("reset-initialize rejects a different or terminal lock without clearing state", (t) => {
    const different = lock();
    different.stableVersion = "2.1.0";
    different.nextStableVersion = "2.2.0";
    different.nextDevelopmentVersion = "2.2.0-devel";
    different.releaseBranch = "release/2.1.0";
    different.promotion.branch = different.releaseBranch;
    const a = adapters(different);
    t.throws(() => resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("e"), confirmReset: "2.0.0", adapters: a }), { message: /identity differs/ });
    t.is(a.clears.length, 0);

    const terminal = lock();
    terminal.status = "aborted";
    const b = adapters(terminal);
    t.throws(() => resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("e"), confirmReset: "2.0.0", adapters: b }), { message: /not a failed partial/ });
    t.is(b.clears.length, 0);
});

test("reset-initialize clears a marker-only failed same-release partial start", (t) => {
    const a = adapters();
    const marker = { schema: "release-train-start.v1", repository: "scramjetorg/transform-hub", stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", releaseBranch: "release/2.0.0", anchor: sha("a") };
    a.reservation.readMarker = () => marker;
    const result = resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("a"), confirmReset: "2.0.0", adapters: a });
    t.is(result.status, "active");
    t.is(a.writes.length, 1);
    t.deepEqual(a.clears.map((clear) => clear.type), ["lock", "marker"]);
});

test("reset-initialize rejects a normal promotion PR train without clearing its marker", (t) => {
    const a = adapters();
    a.reservation.readMarker = () => ({ schema: "release-train-start.v1", repository: "scramjetorg/transform-hub", stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", releaseBranch: "release/2.0.0", anchor: sha("a") });
    a.github.findPromotions = () => [{ number: 42, state: "open", headSha: sha("c") }];
    t.throws(() => resetInitialize({ stableVersion: "2.0.0", nextDevelopmentVersion: "2.1.0-devel", develSha: sha("a"), confirmReset: "2.0.0", adapters: a }), { message: /normal promotion PR train/ });
    t.is(a.clears.length, 0);
});
