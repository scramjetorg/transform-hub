export type GetTopicsResponse = {
    name: string;
    actors: {
        type: string;
        role: string;
        host: string | undefined;
        stream: boolean;
    }[];
}[]
