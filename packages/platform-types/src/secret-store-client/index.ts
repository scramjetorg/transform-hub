/* eslint-disable camelcase */
import { IObjectLogger } from "@scramjet/types";

export type OrganisationSecrets = {
    s3_username: string;
    s3_password: string;
    mother_key: string;
}

export type SecretStoreAppRoleCreds = {
    role_id: string;
    secret_id: string;
}

export type SecretStoreClientOptions = {
    driver?: string;
    endpoint: string;
    appRoleCreds: SecretStoreAppRoleCreds;
    appRole_path: string;
};
export interface ISecretStoreClient {
    getLogger(): IObjectLogger;
    approleLogin(): Promise<any>;
    read<T>(orgId: string): Promise<T | undefined>;
    write(orgId: string, keyVal: OrganisationSecrets): Promise<any>
    patch(orgId: string, keyVal: OrganisationSecrets): Promise<any>
    delete(orgId: string): Promise<any>
}

/*
* requestOptions refer to the options of the request package:
* https://www.npmjs.com/package/request#requestoptions-callback
* TODO: since this package is deprecated we need to replace it in secret-store-client.
*/
export type reqOptions = {
    headers?: {},
    agentOptions: {
        cert: ".cert",
        key: ".key",
        passphrase?: "password",
        securityOptions?: "SSL_OP_NO_SSLv3",
    },
};
