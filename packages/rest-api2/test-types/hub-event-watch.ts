import type { HubClient, HubWatchError } from "../src";
import type { ManifestSequenceAppContext } from "@scramjet/sequence-types";
import type { buildAppContext } from "../../runner-node/src/context";

declare const client: HubClient;
type BuiltAppContext = ReturnType<typeof buildAppContext>["context"];
declare const context: BuiltAppContext;
declare const manifestContext: ManifestSequenceAppContext<{}, unknown, HubClient>;
declare const signal: AbortSignal;

const direct = client.events.watch("sequence", { signal });
const hosted = context.hubClient().events.watch("health", { signal });
const manifestHosted = manifestContext.hubClient().events.watch("topic", { signal });
const defaultOptions = client.events.watch("instance");
// @ts-expect-error opaque watch transport is exposed only through events.watch
client.watchEvents.get();
direct.next().then((result) => {
    if (result.done) return;
    const value = result.value;
    if (value?.kind === "sequence" && value.type === "snapshot") {
        value.items;
        // @ts-expect-error sequence snapshots do not expose nonexistent payload fields
        value.nonexistent;
    }
});
hosted.next().then((result) => {
    if (result.done) return;
    const value = result.value;
    if (value?.kind === "health" && value.type === "snapshot") {
        value.items[0]?.healthy;
        // @ts-expect-error health snapshot items do not expose nonexistent payload fields
        value.items[0]?.nonexistent;
    }
});
manifestHosted.next().then((result) => {
    if (result.done) return;
    const value = result.value;
    if (value?.kind === "topic" && value.type === "snapshot") value.items[0]?.name;
});
defaultOptions.next().then((result) => {
    if (result.done) return;
    const value = result.value;
    if (value?.kind === "instance" && value.type === "snapshot") value.items[0]?.id;
});
direct.close().then(() => undefined);
const error: HubWatchError | undefined = direct.health.error;
void error;

// @ts-expect-error only the four defined watch kinds are accepted
client.events.watch("unknown");
// @ts-expect-error resume/filter options are intentionally not public
client.events.watch("sequence", { cursor: { hubId: "hub", epoch: "epoch", position: 1 } });
