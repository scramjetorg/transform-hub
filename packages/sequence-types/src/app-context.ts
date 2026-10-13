import { BaseAppContext, AppConfig } from "@scramjet/runtime-types";
import { ManifestDeclaration, ManifestReceipt } from "@scramjet/runtime-types";

/**
 * Minimal route-registration surface for sequence authors, without
 * importing the full APIExpose HTTP server types.
 */
export interface SequenceAPISurface {
    use(path: string | RegExp, ...handlers: any[]): void;
}

/** API surface for current hosted sequences that support instance manifests. */
export interface ManifestSequenceAPISurface extends SequenceAPISurface {
    /** Publish public descriptive metadata for this running instance. */
    declare(declaration: ManifestDeclaration): Promise<ManifestReceipt>;
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

    /** Retained legacy `this.hub` compatibility accessor; prefer typed v2 accessors where available. */
    hub: HubClientType;

    /** Retained legacy `this.space` compatibility accessor; prefer typed v2 accessors where available. */
    space: SpaceClientType;
}

/**
 * Author context for current hosted runtimes with manifest declaration support.
 * This does not imply that every HTTP API server or legacy Runner implements declare().
 */
export interface ManifestSequenceAppContext<
    AppConfigType extends AppConfig = AppConfig,
    State extends any = any,
    HubClientType = unknown,
    SpaceClientType = unknown
> extends SequenceAppContext<AppConfigType, State, HubClientType, SpaceClientType> {
    api: ManifestSequenceAPISurface;
}
