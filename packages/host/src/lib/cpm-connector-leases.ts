const MANAGER_GUEST_MIN_WAITING_STREAMS = 128;

export function getManagerGuestMinWaitingStreams(configuredMinimum: number, configuredUpstreamMinimum?: number): number {
    return Math.max(configuredUpstreamMinimum ?? configuredMinimum, MANAGER_GUEST_MIN_WAITING_STREAMS);
}
