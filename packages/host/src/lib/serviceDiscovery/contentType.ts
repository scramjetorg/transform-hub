export type ContentType = "text/x-ndjson" | "application/x-ndjson" | "text/plain" | "application/octet-stream"

export const isContentType = (contentType: string): contentType is ContentType => {
    return [
        "text/x-ndjson",
        "application/x-ndjson",
        "text/plain",
        "application/octet-stream"
    ].includes(contentType);
};
