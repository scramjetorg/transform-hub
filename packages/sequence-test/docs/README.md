# @scramjet/sequence-test Docs

These docs are for sequence developers writing AVA tests for Scramjet Transform Sequences.

Start with sequence behavior:

- [`testing-input-output.md`](testing-input-output.md): map input records and assert output records.
- [`testing-appcontext.md`](testing-appcontext.md): test sequences that use app context.
- [`testing-hub-calls.md`](testing-hub-calls.md): test expected outbound Hub calls.
- [`testing-lifecycle-calls.md`](testing-lifecycle-calls.md): test sequences that call lifecycle operations.
- [`testing-events.md`](testing-events.md): test event usage.
- [`testing-exposed-api.md`](testing-exposed-api.md): test exposed HTTP APIs.
- [`runner-behavior.md`](runner-behavior.md): adapter and runner details.

Runner protocol details live in [`runner-behavior.md`](runner-behavior.md). Use those details when extending the harness or diagnosing protocol behavior, not as the primary sequence test style.
