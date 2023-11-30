export class BashScriptError extends Error {
    exitCode: number;

    constructor(message: string, exitCode?: number) {
        const errorStart = "[Error] ";

        if (message.startsWith(errorStart)) message = message.substring(errorStart.length);
        super(message);
        this.exitCode = exitCode || -1;
    }
}
