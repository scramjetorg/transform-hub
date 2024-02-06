import { ContentType } from "@scramjet/types";

export const isContentType = (contentType: string): contentType is ContentType => {
    return [
        "text/x-ndjson",
        "application/x-ndjson",
        "text/plain",
        "application/octet-stream"
    ].includes(contentType);
};
