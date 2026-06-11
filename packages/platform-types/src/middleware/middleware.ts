import { IncomingHttpHeaders, IncomingMessage } from "http";
import { APIRoute, IObjectLogger, LogLevel } from "@scramjet/types";
import { AccountStatus, OrganisationId, OrganisationType, UserId } from "../organisation-store-client";
import { ServerConfig } from "@scramjet/api-server";
import { PaymentsStatus, PaymentsUserId } from "../payments-client";

export type MiddlewareUser = {
    id: string;
    data: { [key: string]: any };
};

export type MiddlewareIncomingMessage = IncomingMessage & {
    authorized: boolean;
    user?: MiddlewareUser;
    organisation: OrganisationType;
};

export type MiddlewareEnrichedMessage = IncomingMessage & {
    headers: IncomingHttpHeaders & {
        "x-mw-user": string;
        "x-mw-org-id": string;
        "x-mw-org-status": AccountStatus;
        "x-mw-acc-type": string;
        "x-mw-billable": string;
        "x-mw-bill-status": PaymentsStatus;
        "x-mw-self-hosted-limit": string;
    };
};

export type MiddlewareData = {
    userId: UserId | undefined;
    organisationId: OrganisationId | undefined;
    organisationStatus: AccountStatus | undefined;
    accountType: string | undefined;
    paymentsUserId: PaymentsUserId | undefined;
    paymentsStatus: PaymentsStatus | undefined;
    selfHostedLimit: number | undefined;
};

export type MiddlewareDecoratorFactoryOptions = {
    secret: (req: IncomingMessage, tokenHeader: any, tokenPayload: any, callback: (value: unknown) => void) => void;
};

export type MiddlewareController = (apiBase: string, router: APIRoute) => { logger: IObjectLogger };

export type ForwardToOrchestratorOptions = {
    method?: string;
    protected?: boolean;
    dev?: boolean;
};

export type MiddlewareServerConfiguration = { port: number, host?: string } & ServerConfig;

export type MiddlewareConfiguration = {
    authorizeAll: boolean;
    logLevel?: LogLevel;
    orchestratorUrl: string;
    secret: string;
    hybrid: boolean;
    sslKeyPath: string;
    sslCertPath: string;
};

export type MiddlewareIAMConfiguration = {
    cache: boolean;
    rateLimit: boolean;
    jwksRequestsPerMinute: number;
    jwksUri: string;
};
export type MiddlewareMonitoringConfiguration = {
    port: number,
    host: string,
    path: string
}
