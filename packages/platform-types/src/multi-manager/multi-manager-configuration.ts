export type MultiManagerApiConfig = {
    base: string;
};

export type MultiManagerConfig = {
    version: string;
    apiServer: MultiManagerApiConfig;
}

export type ManagersListResponse = {
    id: string;
}[];
