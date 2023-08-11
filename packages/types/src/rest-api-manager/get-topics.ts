export type GetTopicsResponse = {
    name: string;
    contentType: string;
    actors: {
        hostId?:string;
    }[]
}[];
