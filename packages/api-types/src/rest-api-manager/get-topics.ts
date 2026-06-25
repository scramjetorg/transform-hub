export type GetTopicsResponse = {
    name: string;
    contentType: string;
    actors: {
        hostId?:string;
        stream: boolean,
        retired: boolean,
        role: string,
        type: string
    }[]
}[];
