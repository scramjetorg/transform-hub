import { AppConfig, BaseAppContext } from "@scramjet/runtime-types";
import { HostClient } from "./host-client";
import { ManagerClient } from "./manager-client";
import { APIExpose } from "./api-expose";

/**
 * Strict API-specific AppContext with concrete client types.
 *
 * Extends BaseAppContext binding HubClientType to API-owned HostClient
 * and SpaceClientType to API-owned ManagerClient, so that both the
 * `hubClient()`/`spaceClient()` methods and the direct `hub`/`space`/`api`
 * members resolve to concrete API-owned interface stubs (full contracts
 * in Phase 3).
 */
export interface StrictAppContext<
    AppConfigType extends AppConfig = AppConfig,
    State extends any = any,
> extends BaseAppContext<AppConfigType, State, HostClient, ManagerClient> {
    hub: HostClient;
    space: ManagerClient;
    api: APIExpose;
}

/**
 * Hub-narrowed AppContext: fixes the hub client to HostClient while
 * keeping space and api as API-owned stubs.
 */
export interface HubAppContext<
    AppConfigType extends AppConfig = AppConfig,
    State extends any = any,
> extends BaseAppContext<AppConfigType, State, HostClient, ManagerClient> {
    hub: HostClient;
    space: ManagerClient;
    api: APIExpose;
}

/**
 * Space-narrowed AppContext: fixes the space client to ManagerClient
 * while keeping hub and api as API-owned stubs.
 */
export interface SpaceAppContext<
    AppConfigType extends AppConfig = AppConfig,
    State extends any = any,
> extends BaseAppContext<AppConfigType, State, HostClient, ManagerClient> {
    hub: HostClient;
    space: ManagerClient;
    api: APIExpose;
}
