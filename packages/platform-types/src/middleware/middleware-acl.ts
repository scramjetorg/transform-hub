import { IObjectLogger, Middleware } from "@scramjet/types";
import { IAccessControlList } from "./acl";

export type MiddlewareRoleType = "guest" | "authenticated" | "subscribed" | "developer";
export type MiddlewareResourceType = string;
export type MiddlewarePermissionType = "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "PATCH";
export type MiddlewareAccessControlList = IAccessControlList<
    MiddlewareRoleType,
    MiddlewareResourceType,
    MiddlewarePermissionType
>;
export type MiddlewareAccessControlListFactory = (
    acl: MiddlewareAccessControlList,
    secret: string | undefined,
    logger?: IObjectLogger
) => Middleware;
