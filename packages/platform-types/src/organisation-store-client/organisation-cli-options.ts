import { OrganisationStoreType } from "./organisation";

export type OrganisationStoreClientCliOptions = {
    organisationStoreAdapter?: OrganisationStoreType;
    organisationStorePath?: string;
    organisationStoreForceExisting?: boolean;
};
