import { ServerConfig } from "@scramjet/api-server";
import { APIRoute, IObjectLogger, Port } from "@scramjet/types";
import { AuthenticationConfig, IAuthenticationClient } from "../authenticaton-client";
import { IOrganisationStoreClient } from "../organisation-store-client";
import { IPaymentsClient } from "../payments-client";
import { ISecretStoreClient } from "../secret-store-client";
import { IOrganisationController, IUserController } from "./controllers";

export * from "./orchestrator-cli-options";

export type OrchestratorController = () => { logger: IObjectLogger; router: APIRoute };

export type AuthenticationControllerConfig = AuthenticationConfig & {
    domain: string;
};

export type AuthenticationControllerRequestPayload = {
    username?: string;
    password?: string;
};

export type OrchestratorRouter = { logger: IObjectLogger; router: APIRoute };

export type AuthenticationRouter = (apiBase: string, authenticationClient: IAuthenticationClient) => OrchestratorRouter;

export type OrganisationRouter = (
    apiBase: string,
    organisationController: IOrganisationController
) => OrchestratorRouter;

export type SpaceRouter = (
    apiBase: string,
    organisationStoreClient: IOrganisationStoreClient,
    secretStoreClient?: ISecretStoreClient
) => OrchestratorRouter;

export type PaymentRouterParams = {
    apiBase: string;
    paymentsClient: IPaymentsClient;
    organisationController: IOrganisationController;
    userController: IUserController;
};

export type PaymentRouter = (params: PaymentRouterParams) => OrchestratorRouter;

export type CheckoutSessionsRouterParams = {
    apiBase: string;
    paymentsClient: IPaymentsClient;
    organisationController: IOrganisationController;
    userController: IUserController;
};

export type CheckoutSessionsRouter = (params: CheckoutSessionsRouterParams) => OrchestratorRouter;

export type UserRouter = (
    apiBase: string,
    userController: IUserController,
    organisationController: IOrganisationController
) => OrchestratorRouter;

export type IS3Client = any;

export type WebhookRouter = (
    apiBase: string,
    authenticationClient: IAuthenticationClient,
    organisationController: IOrganisationController,
    paymentsClient: IPaymentsClient
) => OrchestratorRouter;

export type OrchestratorOptions = { port: Port, host?: string } & ServerConfig;
export * from "./controllers";
