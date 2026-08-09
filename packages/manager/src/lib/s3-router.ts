import { Client as MinioClient } from "minio";
import { S3Proxy } from "./storage-routers/s3-proxy";
import { DiskProxy } from "./storage-routers/disk-proxy";

export const getS3Router = async (
    s3Client: MinioClient | undefined,
    config: {
        base: string,
        id: string,
        bucket: string,
        bucketLimit: number
    }
) => {
    if (!s3Client)
        return new DiskProxy(config);

    return new S3Proxy(s3Client, config);
};
