/** Hub-relative paths for instance and sequence manifest routes. */
export const INSTANCE_MANIFEST_ENDPOINT = "/instances/:instanceId/manifest";
export const SEQUENCE_MANIFEST_ENDPOINT = "/sequences/:sequenceId/manifest";
export const HUB_EVENT_WATCH_ENDPOINT = "/events/watch";
export { HUB_WATCH_HEARTBEAT_MS, HUB_WATCH_OPEN_TIMEOUT_MS, HUB_WATCH_SILENCE_TIMEOUT_MS, HUB_WATCH_DETECTION_BOUND_MS, HUB_WATCH_MAX_TIMER_LAG_MS, HUB_WATCH_QUEUE_CAPACITY } from "@scramjet/runtime-types";
