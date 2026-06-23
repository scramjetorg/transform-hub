const MANAGER_GUEST_CONTROL_STREAMS = 2;
const MANAGER_GUEST_API_SPARE_STREAMS = 2;
const MANAGER_GUEST_MIN_WAITING_STREAMS = MANAGER_GUEST_CONTROL_STREAMS + MANAGER_GUEST_API_SPARE_STREAMS;

export function getManagerGuestMinWaitingStreams(configuredMinimum: number): number {
    return Math.max(configuredMinimum, MANAGER_GUEST_MIN_WAITING_STREAMS);
}
