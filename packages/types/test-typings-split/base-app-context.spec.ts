/**
 * base-app-context.spec.ts
 *
 * Type tests for BaseAppContext, sequence-facing AppContext exports,
 * and API-specific strict aliases.
 *
 * Verifies:
 *   1. BaseAppContext is the minimal runtime-neutral context subset.
 *   2. Sequence-facing AppContext exports add opaque api/hub/space.
 *   3. API-specific strict aliases bind concrete client types.
 *   4. Application function types accept the new context types.
 *
 * Invoke via: npx tsc -p packages/types/test-typings-split/tsconfig.json --noEmit
 */

import type { AppConfig } from "@scramjet/types";
import type { AppContext, Application, ReadableApp, WritableApp, TransformApp, InertApp } from "@scramjet/types";
import type { ILocalStorage } from "@scramjet/types";
import type { IObjectLogger } from "@scramjet/types";
import type { AppError, AppErrorConstructor } from "@scramjet/types";
import type { FunctionDefinition } from "@scramjet/types";

// --- New split package imports (Phase 2: packages exist) ---
import type { BaseAppContext, AppConfig as RuntimeAppConfig } from "@scramjet/runtime-types";
import type {
  SequenceAppContext,
  SequenceApplication,
  SequenceReadableApp,
  SequenceWritableApp,
  SequenceTransformApp,
  SequenceInertApp,
  SequenceAPISurface,
} from "@scramjet/sequence-types";
import type {
  HostClient,
  ManagerClient,
  APIExpose,
  HubAppContext as ApiHubAppContext,
  SpaceAppContext as ApiSpaceAppContext,
  StrictAppContext,
} from "@scramjet/api-types";

// =============================================================================
// Type-level assertion helpers
// =============================================================================

type Assert<T extends true> = T;
type IsAssignable<A, B> = B extends A ? true : false;

// =============================================================================
// Basic AppContext instantiation tests
// =============================================================================

type _SimpleConfig = { threshold: number; label: string };
type _SimpleState = { lastValue: number };

type _CustomAppContext = AppContext<_SimpleConfig, _SimpleState>;
type _CustomContextLogger = _CustomAppContext["logger"];
type _CustomContextConfig = _CustomAppContext["config"];
type _CustomContextState = _CustomAppContext["initialState"];

type _AppContextWithClients<H, S> = AppContext<AppConfig, any, H, S>;
type _StringAppContext = _AppContextWithClients<string, string>;

// =============================================================================
// Application function type tests
// =============================================================================

type _MyTransformApp = TransformApp<
  { input: number }, { output: string }, [{ multiplier: number }],
  { count: number }, _SimpleConfig, void, string, string
>;
type _MyReadableApp = ReadableApp<
  { data: Buffer }, [{ encoding: string }], { processed: number },
  _SimpleConfig, void, string, string
>;
type _MyWritableApp = WritableApp<
  { event: string }, [{ batchSize: number }], { received: number },
  _SimpleConfig, void, string, string
>;
type _MyInertApp = InertApp<
  [{ greeting: string }], { started: boolean }, _SimpleConfig, void, string, string
>;
type _AllAppTypes = Application;
type _AllAppTypesWithClients = Application<any, any, any, any, any, string, string>;

// =============================================================================
// Structural shape tests for old AppContext (exists and resolvable)
// =============================================================================

type _HasAddMonitoringHandler = AppContext<AppConfig, any>["addMonitoringHandler"];
type _HasAddStopHandler = AppContext<AppConfig, any>["addStopHandler"];
type _HasAddKillHandler = AppContext<AppConfig, any>["addKillHandler"];
type _HasKeepAlive = AppContext<AppConfig, any>["keepAlive"];
type _HasEnd = AppContext<AppConfig, any>["end"];
type _HasDestroy = AppContext<AppConfig, any>["destroy"];
type _HasSave = AppContext<AppConfig, any>["save"];
type _HasOn = AppContext<AppConfig, any>["on"];
type _HasEmit = AppContext<AppConfig, any>["emit"];
type _HasEmitToSpace = AppContext<AppConfig, any>["emitToSpace"];
type _HasDescribe = AppContext<AppConfig, any>["describe"];
type _HasHubClient = AppContext<AppConfig, any, unknown, unknown>["hubClient"];
type _HasSpaceClient = AppContext<AppConfig, any, unknown, unknown>["spaceClient"];

// =============================================================================
// BaseAppContext is a structural subset of old AppContext
// =============================================================================

type _BaseAppContextSubsetCheck<C extends AppConfig, S> =
  IsAssignable<BaseAppContext<C, S>, AppContext<C, S>>;
type _AssertBaseAppContextSubset = Assert<_BaseAppContextSubsetCheck<AppConfig, any>>;

// =============================================================================
// SequenceAppContext member-level assertions
// =============================================================================

// SequenceAppContext is a superset of BaseAppContext
type _SequenceAppContextExtends<C extends AppConfig, S> =
  IsAssignable<BaseAppContext<C, S>, SequenceAppContext<C, S>>;
type _AssertSequenceAppContextExtends = Assert<_SequenceAppContextExtends<AppConfig, any>>;

// SequenceAppContext has opaque hub/space, minimal api, and generic hubClient/spaceClient
type _SeqCtx = SequenceAppContext<_SimpleConfig, _SimpleState>;

// api has `use` (the key author-facing method)
type _SeqApiUseType = SequenceAPISurface["use"];
type _SeqCtxApiExists = _SeqCtx["api"];

// hubClient/spaceClient return generic types (unknown by default)
type _SeqHubClientReturn = ReturnType<_SeqCtx["hubClient"]>;
type _SeqSpaceClientReturn = ReturnType<_SeqCtx["spaceClient"]>;

// SequenceTransformApp's `this` type is SequenceAppContext, so authors see
// api/hub/space/hubClient/spaceClient in the function context.
type _SeqTransformThis = ThisParameterType<SequenceTransformApp>;
type _SeqTransformThisApi = _SeqTransformThis["api"];
type _SeqTransformThisHub = _SeqTransformThis["hub"];
type _SeqTransformThisSpace = _SeqTransformThis["space"];
type _SeqTransformThisHubClient = _SeqTransformThis["hubClient"];
type _SeqTransformThisSpaceClient = _SeqTransformThis["spaceClient"];

// =============================================================================
// API-specific strict aliases: member-type assertions
// =============================================================================

// StrictAppContext binds hubClient()/spaceClient() to HostClient/ManagerClient
type _StrictCtx = StrictAppContext<_SimpleConfig, _SimpleState>;
type _StrictHubClientReturn = ReturnType<_StrictCtx["hubClient"]>;
type _StrictSpaceClientReturn = ReturnType<_StrictCtx["spaceClient"]>;

// StrictAppContext direct members are API-owned stubs
type _StrictHubType = _StrictCtx["hub"];
type _StrictSpaceType = _StrictCtx["space"];
type _StrictApiType = _StrictCtx["api"];

// Assert host client members are structurally compatible with the API-owned HostClient
type _AssertStrictHubIsHostClient = Assert<IsAssignable<HostClient, _StrictHubType>>;
type _AssertStrictSpaceIsManagerClient = Assert<IsAssignable<ManagerClient, _StrictSpaceType>>;
type _AssertStrictApiIsAPIExpose = Assert<IsAssignable<APIExpose, _StrictApiType>>;
type _AssertStrictHubClientIsHostClient = Assert<IsAssignable<HostClient, _StrictHubClientReturn>>;
type _AssertStrictSpaceClientIsManagerClient = Assert<IsAssignable<ManagerClient, _StrictSpaceClientReturn>>;

// HubAppContext — hub is HostClient
type _HubCtx = ApiHubAppContext<_SimpleConfig, _SimpleState>;
type _HubCtxHub = _HubCtx["hub"];
type _AssertHubCtxHubIsHostClient = Assert<IsAssignable<HostClient, _HubCtxHub>>;

// SpaceAppContext — space is ManagerClient
type _SpaceCtx = ApiSpaceAppContext<_SimpleConfig, _SimpleState>;
type _SpaceCtxSpace = _SpaceCtx["space"];
type _AssertSpaceCtxSpaceIsManagerClient = Assert<IsAssignable<ManagerClient, _SpaceCtxSpace>>;

// =============================================================================
// Value-level assignability checks using declare const
// =============================================================================

declare const _oldCtxDual: AppContext<AppConfig, any>;
const _baseDual: BaseAppContext<AppConfig, any> = _oldCtxDual;
const _seqDual: SequenceAppContext<AppConfig, any> = _oldCtxDual;
