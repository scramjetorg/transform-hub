export type GetSequenceInstancesResponse = readonly string[]
    | {
        opStatus: string,
        error?: string | Error | unknown
    };
