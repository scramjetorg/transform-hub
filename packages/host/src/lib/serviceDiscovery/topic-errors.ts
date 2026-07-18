export const TOPIC_DISCONNECTED = "TOPIC_DISCONNECTED" as const;
export const TOPIC_DELETED = "TOPIC_DELETED" as const;
export const TOPIC_CONTENT_TYPE_MISMATCH = "TOPIC_CONTENT_TYPE_MISMATCH" as const;

export type TopicErrorCode = typeof TOPIC_DISCONNECTED | typeof TOPIC_DELETED | typeof TOPIC_CONTENT_TYPE_MISMATCH;

export function topicError(code: TopicErrorCode, message: string): Error & { code: TopicErrorCode } {
    return Object.assign(new Error(message), { code });
}
