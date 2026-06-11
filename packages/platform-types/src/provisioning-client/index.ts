import { IObjectLogger } from "@scramjet/types";
import { S3Credentials } from "../s3-adapter";

export type RestProvisionClientConfig = {
    driver?: "rest";
    endpoint: string;
    user: string;
    password: string;
};

export type NoProvisionClientConfig = {
    driver: "null";
}

export type SpawnProvisionClientConfig = {
    driver: "spawn";
}

export type ProvisionClientConfig = RestProvisionClientConfig | SpawnProvisionClientConfig | NoProvisionClientConfig;

export type ProvisionClientCreateArgs = {
    organisationId: string;
    stripeId: string;
    credentials: S3Credentials
};

export type ProvisionClientRemoveArgs = {
    organisationId: string;
};

export interface IProvisionClient {
    logger: IObjectLogger;
    create: (args: ProvisionClientCreateArgs) => Promise<void>;
    remove: (args: ProvisionClientRemoveArgs) => Promise<void>;
}
