export type ReadinessDiagnostic = {
    code: string;
    phase: "initialize";
    message: string;
};

export type ReadinessMessageData = {
    state: "ready" | "errored";
    exposePath?: string;
    exposeHost?: string;
    exposePort?: number;
    diagnostic?: ReadinessDiagnostic;
};
