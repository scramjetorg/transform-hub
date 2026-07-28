export class ApiCommandError extends Error {
    constructor(readonly code: string, readonly exitCode: number, message: string, readonly diagnostic?: string) {
        super(message);
    }
}
