export type MultiManagerResponse = {
    baseUrl: string;
    managers: any[];
    id: string;
};

export type MultiManagersResponse = MultiManagerResponse[];

export type VersionResponse = {
    version: string;
};
