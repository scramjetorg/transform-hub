export type GetStatusResponse = {
    cpm: {
        cpmId?: string;
        connected?: boolean;
    };
    ready?: boolean;
};
