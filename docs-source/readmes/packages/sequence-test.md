AVA-friendly helpers for testing Scramjet Transform Sequences from the sequence developer's point of view. Supports running Node sequences directly, capturing outputs, and asserting lifecycle behavior without starting a full Transform Hub instance.

Key features:
- `runSequence()` — execute a Node sequence fixture and capture output
- `createHubHarness()` — in-memory Hub/context simulation for lifecycle, events, logging, and API registration tests
- `resolveSequenceFixtureMetadata()` — validate fixture metadata from package.json

See the generated package docs for detailed usage and stability notes.
