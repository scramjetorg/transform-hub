const MANAGER_GUEST_MIN_WAITING_STREAMS = 128;

export function getManagerGuestMinWaitingStreams(configuredMinimum: number, configuredUpstreamMinimum?: number): number {
    return Math.max(configuredMinimum, configuredUpstreamMinimum ?? 0, MANAGER_GUEST_MIN_WAITING_STREAMS);
}
