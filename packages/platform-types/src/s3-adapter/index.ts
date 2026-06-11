import { IObjectLogger } from "@scramjet/types";

export type IAMGroup = {
    Path: string;
    GroupName: string;
    GroupId: string;
    Arn: string;
    CreateDate: Date;
};

export type IAMUser = {
    Path: string;
    UserName: string;
    UserId: string;
    Arn: string;
    CreateDate: Date;
};

export type S3AdapterConfig = {
    driver: string;
    profile?: string;
    s3Region?: string;
    s3Endpoint?: string;
    iamRegion?: string;
    iamEndpoint?: string;
};

export type PrepareEnvironmentArgs = {
    groupName?: string;
    userName: string;
    bucketName: string;
};

export type S3Credentials = {
    accessKey: string;
    secretKey: string;
};

export type RollbackArgs = Partial<
    PrepareEnvironmentArgs & {
        userPolicyId: string;
        bucketPolicyId: string;
        credentials?: S3Credentials;
    } & {
        user?: IAMUser;
        group?: IAMGroup;
        bucketName: string;
    } & {
        accessKey?: string;
    }
>;

export type PrepareEnvironmentResult = RollbackArgs & {
    credentials?: S3Credentials;
};

export type CleanupArgs = {
    groupName: string;
    accessKey: string;
};

export interface IS3Adapter {
    logger: IObjectLogger;
    init: () => void;
    createBucket: (bucketName: string) => Promise<{ Location?: string }>;
    createGroup: (groupName: string) => Promise<IAMGroup>;
    createUser: (userName: string) => Promise<IAMUser>;
    addUserToGroup: (userName: string, group: IAMGroup) => Promise<{}>;
    createCredentials: (userName: string) => Promise<{ accessKey: string; secretKey: string }>;
    setUserBucketPolicy: (group: IAMUser, bucketName: string) => Promise<void>;
    getConfigValue: (key: keyof S3AdapterConfig) => any;
    prepareEnvironment: (args: PrepareEnvironmentArgs, result?: RollbackArgs) => Promise<void>;
    deleteEnvironment: (args: RollbackArgs) => Promise<void>;
    cleanup: (args: CleanupArgs) => Promise<void>;
}
