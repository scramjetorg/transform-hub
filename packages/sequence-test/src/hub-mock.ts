export type {
    HubCallMatch,
    HubHarness,
    HubMock,
    HubMockRequest,
    HubMockResponse,
    HubRouteBuilder,
    HubTimelineEntry
} from "./hub-harness";

import { createHubHarness } from "./hub-harness";
import type { HubMock as HubMockType } from "./hub-harness";

export function createHubMock(): HubMockType {
    const harness = createHubHarness();

    return harness.hub;
}
