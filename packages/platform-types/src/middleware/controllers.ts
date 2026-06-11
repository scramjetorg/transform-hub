import { MiddlewareController } from "./middleware";
import { ParsedMessage } from "@scramjet/types";
import { IOrganisationStoreClient } from "../organisation-store-client";

export type ManagerControllerConfig = {
    url: string;
};

export type ManagerControllerFactory = (
    organisationStoreClient: IOrganisationStoreClient, forceAuthorization: boolean
) => MiddlewareController;
export type ForwardControllerFactory = () => MiddlewareController;
export type ForwardArgs = {
    req: ParsedMessage;
    destination: string;
    prefix: string;
    targetPath: string;
};
export type ForwardedParsedMessage = ParsedMessage & {
    forwardTo?: string;
    forwardPrefix?: string;
    forwardTargetPath?: string;
};
