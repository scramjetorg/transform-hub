import { PaymentsStatus, PaymentsSystem, PaymentsUserId } from "../payments-client";
import { IObjectLogger } from "@scramjet/types";

export enum OrganisationStoreType {
    CouchDB = "couchdb",
    InMemory = "inmemory",
}

export type OrganisationStoreOptions = {
    type: OrganisationStoreType;
    address?: string;
    forceExisting: boolean;
};

export type ClusterConfig = {
    mhServiceName: string;
    mmServiceName: string;
    clusterDomain: string;
};

// Types below maps directly to Organisation Database schema.
// @TODO is there any way to transform TS types into CouchDB schema (or the other way around)?

export enum AccountStatus {
    Initiated = "INITIATED",
    Verified = "VERIFIED",
    Active = "ACTIVE",
    Suspended = "SUSPENDED",
    InDeletion = "IN_DELETION",
    Deleted = "DELETED",
}

// Example:
// {
//     "organisation-id": "23dcf3b42b3d448f880ed21c7b294313",
//     "users": [
//         {
//              "user-id": "23dcf3b42b3d448f880ed21c7b294313",
//              "user-account-status":"ACTIVE",
//              "accepted-term-of-service-timestamp":1643196737,
//              "accepted-terms-of-service-version":"v0.1"
//         }
//     ],
//     "created-at": 1643196737,
//     "updated-at": 1643196737,
//     "account-type": "Free Trial",
//     "organisation-status": "ACTIVE",
//     "projects": [
//         {
//             "project-id": "c3a6d78d0db7491f9ce687855490134f",
//             "project-name": "Project 1",
//             "managers": [
//                 {
//                     "manager-id": "c3a6d78d0db7491f9ce687855490134f",
//                     "manager-port-for-hosts-connection": 22331,
//                     "multi-manager-id": "dbc633bacdfc4a97831a16ae032c252e",
//                     "multi-manager-endpoint": "mm.endpoint",
//                     "multi-manager-port": 11000,
//                     "multi-manager-api-version": "v1",
//                     "hosts": [
//                         {
//                             "host-id": "0be7a2a0843c4a179068b3a368eba97b",
//                             "host-port": 8000,
//                             "host-api-version": "v1",
//                             "multi-host-endpoint": "mh.endpoint",
//                             "multi-host-port": 10000,
//                             "multi-host-api-version": "v1"
//                         }
//                     ]
//                 }
//             ]
//         }
//     ]
// }
export type UserId = string;
export type OrganisationId = string;

export type Host = {
    hostId: string;
    hostPort: number;
    hostApiVersion: string;
    multiHostEndpoint: string;
    multiHostPort: number;
    multiHostApiVersion: string;
};

export type Manager = {
    managerId: string;
    multiManagerId: string;
    multiManagerEndpoint: string;
    multiManagerPort: number;
    multiManagerApiVersion: string;
    hosts: Host[];
    accessKeysLimit?: number;
    accessKeys?: { value: string, created: number, description?: string }[];
    selfHostedLimit?: number;
};

export type Project = {
    projectId: string;
    projectName: string;
    managers: Manager[];
};

export type User = {
    userId: UserId;
    userAccountStatus: AccountStatus;
};

export type OrganisationBase = {
    organisationId: OrganisationId;
    createdAt: number;
    organisationStatus: AccountStatus;
    paymentsSystem: PaymentsSystem;
    paymentsStatus: PaymentsStatus;
    accountType: string;
    initialSelfHostedLimit?: number;
    initialAccessKeysLimit?: number;
    users: User[];
};

export type Organisation = OrganisationBase & {
    updatedAt: number;
    paymentsUserId: PaymentsUserId;
    projects: Project[];
};

export type OrganisationType = OrganisationBase | Organisation;

export interface IOrganisationStoreClient {
    logger: IObjectLogger;
    init: () => Promise<void>;
    add: (organisation: OrganisationType) => Promise<void>;
    getById: (organisationId: OrganisationId) => Promise<OrganisationType | null>;
    getByUserId: (userId: UserId) => Promise<OrganisationType | null>;
    getByPaymentsUserId: (paymnetsUserId: PaymentsUserId) => Promise<OrganisationType | null>;
    update: (organisationId: OrganisationId, organisation: OrganisationType) => Promise<boolean>;
    delete: (organisationId: OrganisationId) => Promise<boolean>;
}
