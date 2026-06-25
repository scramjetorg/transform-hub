/**
 * Simplified message protocol types for API-client usage.
 *
 * These are structurally-compatible substitutes for the full protocol types
 * previously in @scramjet/types/message-streams.ts and @scramjet/types/messages/.
 * Full protocol fidelity lives in @scramjet/runtime-types; these are the
 * minimal shapes needed by API client/server packages.
 */

// ---------------------------------------------------------------------------
// Control message codes (simplified from string unions)
// ---------------------------------------------------------------------------

export type ControlMessageCode = string | number;
export type MonitoringMessageCode = string | number;

// ---------------------------------------------------------------------------
// Encoded message types
// ---------------------------------------------------------------------------

export type EncodedMessage<T extends string> = [T, any];

export type EncodedControlMessage = [any, any];
export type EncodedSerializedControlMessage = string;
export type EncodedSerializedMonitoringMessage = string;

export type MessageDataType<_T> = any;

// ---------------------------------------------------------------------------
// Sequence stop/kill message data
// ---------------------------------------------------------------------------

export type StopSequenceMessageData = {
    timeout: number;
    canCallKeepalive: boolean;
};

export type KillMessageData = {
    removeImmediately?: boolean;
};

// ---------------------------------------------------------------------------
// Communication handler interface (simplified)
// ---------------------------------------------------------------------------

export interface ICommunicationHandler {
    addMonitoringHandler(code: any, handler: (data: any) => any): void;
    sendControlMessage(code: any, message: any): Promise<any>;
}
