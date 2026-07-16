export function isTransientReadinessStatus(status: number): boolean {
    return status === 404 || status === 503;
}

export function isSuccessfulReadinessResponse(status: number, body: string): boolean {
    return status === 200 && body === "GET /abc";
}
