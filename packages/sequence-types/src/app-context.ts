import { BaseAppContext, AppConfig } from "@scramjet/runtime-types";

/**
 * Minimal route-registration surface for sequence authors, without
 * importing the full APIExpose HTTP server types.
 */
export interface SequenceAPISurface {
    use(path: string | RegExp, ...handlers: any[]): void;
}

/**
 * Sequence-facing frozen AppContext API.
 *
 * Extends BaseAppContext with opaque `hub`, `space`, and a minimal
 * `api.use` surface that sequence authors need, without importing
 * concrete REST API client types.
 *
 * Generic type parameters:
 *   AppConfigType   — application configuration shape
 *   State           — state type for save()/initialState
 *   HubClientType   — opaque hub client type (defaults to unknown)
 *   SpaceClientType — opaque space client type (defaults to unknown)
 */
export interface SequenceAppContext<
    AppConfigType extends AppConfig = AppConfig,
    State extends any = any,
    HubClientType = unknown,
    SpaceClientType = unknown
> extends BaseAppContext<AppConfigType, State, HubClientType, SpaceClientType> {
    /** Minimal HTTP route registration surface for sequence authors. */
    api: SequenceAPISurface;

    /** Opaque legacy hub client accessor. */
    hub: HubClientType;

    /** Opaque legacy space client accessor. */
    space: SpaceClientType;
}
