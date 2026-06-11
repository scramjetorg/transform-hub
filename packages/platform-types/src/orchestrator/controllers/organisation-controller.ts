import { IObjectLogger } from "@scramjet/types";
import { IAuthenticationClient } from "../../authenticaton-client";
import { AccountStatus, ClusterConfig, IOrganisationStoreClient, Organisation, OrganisationBase, OrganisationId, OrganisationType, User } from "../../organisation-store-client";
import { IPaymentsClient, PaymentsSystem } from "../../payments-client";
import { IProvisionClient } from "../../provisioning-client";
import { IS3Adapter } from "../../s3-adapter";
import { ISecretStoreClient } from "../../secret-store-client";

export type OrganisationControllerParams = {
    organisationStoreClient: IOrganisationStoreClient,
    authenticationClient: IAuthenticationClient,
    paymentsClient: IPaymentsClient,
    provisionClient?: IProvisionClient,
    secretStoreClient?: ISecretStoreClient,
    s3Adapter?: IS3Adapter,
    clusterConfig: ClusterConfig
}

export interface IOrganisationController {
    logger: IObjectLogger;
    remove(organisation: OrganisationType): Promise<{
        opStatus: string;
        message: string;
        errors: any[];
        error?: undefined;
    } | {
        opStatus: string;
        message: string;
        errors?: undefined;
        error?: undefined;
    }>;
    getById(id: string): Promise<OrganisationType | null>;
    getByUserId(id: string): Promise<OrganisationType | null>;
    add(organisation: OrganisationType): Promise<void>;
    create(
        organisationId: OrganisationId,
        organisationStatus: AccountStatus,
        paymentsSystem: PaymentsSystem,
        accountType: string,
        users: User[]
    ): OrganisationBase;
    addProject(organisation: Organisation): Promise<Organisation>;
    createEnvironment(organisation: OrganisationType): Promise<OrganisationBase>
    update(...args: Parameters<IOrganisationStoreClient["update"]>): ReturnType<IOrganisationStoreClient["update"]>
    getByPaymentsUserId(...args: Parameters<IOrganisationStoreClient["getByPaymentsUserId"]>): ReturnType<IOrganisationStoreClient["getByPaymentsUserId"]>
}
