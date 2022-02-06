import { TransformApp } from "@scramjet/types";

export const exp: (TransformApp | { requires: string, contentType: string})[] = [
    { requires: "names", contentType: "application/x-ndjson" }
];
