/**
 * compatibility.spec.ts
 *
 * Compatibility type tests proving representative old @scramjet/types
 * imports resolve and new split-package types have the expected shape.
 *
 * Verifies:
 *   1. Old imports from @scramjet/types still resolve.
 *   2. New split-package imports resolve with expected member types.
 *   3. Strict aliases bind API-owned client types (not any).
 *   4. Old and new equivalent typings are structurally compatible.
 *
 * Invoke via: npx tsc -p packages/types/test-typings-split/tsconfig.json --noEmit
 */

// --- Old @scramjet/types imports (should resolve) ---
import type { AppContext } from "@scramjet/types";
import type { AppConfig } from "@scramjet/types";
import type { Application, ReadableApp, WritableApp, TransformApp, InertApp } from "@scramjet/types";
import type { IObjectLogger } from "@scramjet/types";
import type { ILocalStorage } from "@scramjet/types";
import type { MonitoringHandler, StopHandler, KillHandler } from "@scramjet/types";
import type { AppError, AppErrorConstructor } from "@scramjet/types";
import type { FunctionDefinition } from "@scramjet/types";
import type { HostClient as OldHostClient } from "@scramjet/types";
import type { ManagerClient as OldManagerClient } from "@scramjet/types";
import type { APIExpose as OldAPIExpose } from "@scramjet/types";

// --- New split package imports (Phase 2: packages exist) ---
import type { BaseAppContext } from "@scramjet/runtime-types";
import type { SequenceAppContext, SequenceApplication } from "@scramjet/sequence-types";
import type { StrictAppContext, HostClient, ManagerClient, APIExpose } from "@scramjet/api-types";

// =============================================================================
// Type-level assertion helpers
// =============================================================================

type Assert<T extends true> = T;
type IsAssignable<A, B> = B extends A ? true : false;

// =============================================================================
// Old @scramjet/types imports resolve
// =============================================================================

type _TypeResolutionCheck_Application = Application;
type _TypeResolutionCheck_ReadableApp = ReadableApp;
type _TypeResolutionCheck_WritableApp = WritableApp;
type _TypeResolutionCheck_TransformApp = TransformApp;
type _TypeResolutionCheck_InertApp = InertApp;
type _TypeResolutionCheck_IObjectLogger = IObjectLogger;
type _TypeResolutionCheck_ILocalStorage = ILocalStorage;
type _TypeResolutionCheck_MonitoringHandler = MonitoringHandler;
type _TypeResolutionCheck_StopHandler = StopHandler;
type _TypeResolutionCheck_KillHandler = KillHandler;
type _TypeResolutionCheck_AppError = AppError;
type _TypeResolutionCheck_AppErrorConstructor = AppErrorConstructor;
type _TypeResolutionCheck_FunctionDefinition = FunctionDefinition;
type _TypeResolutionCheck_HostClient = OldHostClient;
type _TypeResolutionCheck_ManagerClient = OldManagerClient;
type _TypeResolutionCheck_APIExpose = OldAPIExpose;
type _TypeResolutionCheck_AppContext = AppContext<AppConfig, any>;

// =============================================================================
// Old AppContext shape is accessible
// =============================================================================

type _AppContextLoggerCheck = _TypeResolutionCheck_AppContext["logger"];
type _AppContextConfigCheck = _TypeResolutionCheck_AppContext["config"];
type _AppContextInstanceIdCheck = _TypeResolutionCheck_AppContext["instanceId"];
type _AppContextDefinitionCheck = _TypeResolutionCheck_AppContext["definition"];
type _AppContextLocalStorageCheck = _TypeResolutionCheck_AppContext["localStorage"];
type _AppContextHubCheck = _TypeResolutionCheck_AppContext["hub"];
type _AppContextSpaceCheck = _TypeResolutionCheck_AppContext["space"];
type _AppContextApiCheck = _TypeResolutionCheck_AppContext["api"];

// =============================================================================
// Old ↔ new structural compatibility (where feasible)
// =============================================================================

// Old AppContext is assignable to BaseAppContext (subset check)
type _OldAppContextIsBaseAppContext = IsAssignable<
  BaseAppContext<AppConfig, any>,
  AppContext<AppConfig, any>
>;
type _AssertOldAppContextIsBaseAppContext = Assert<_OldAppContextIsBaseAppContext>;

// Old AppContext is assignable to SequenceAppContext (extends BaseAppContext)
type _OldAppContextIsSequenceAppContext = IsAssignable<
  SequenceAppContext<AppConfig, any>,
  AppContext<AppConfig, any>
>;
type _AssertOldAppContextIsSequenceAppContext = Assert<_OldAppContextIsSequenceAppContext>;

// =============================================================================
// StrictAppContext member-type assertions
// =============================================================================

// StrictAppContext has the full set of old-AppContext members via
// BaseAppContext extension plus hub/space/api. We verify member types
// directly rather than a structural extends check, because the concrete
// API-owned stubs (HostClient/ManagerClient/APIExpose) are not
// structurally assignable to the old REST client types from
// @scramjet/types (full structural compat requires Phase 3 type
// definitions). Member-level assertions below prove the aliases are
// concretely typed (not any) and correctly bound.

type _StrictCtx = StrictAppContext<AppConfig, any>;

// hubClient() and spaceClient() return API-owned types
type _StrictHubClientReturn = ReturnType<_StrictCtx["hubClient"]>;
type _AssertStrictHubClientIsHostClient = Assert<IsAssignable<HostClient, _StrictHubClientReturn>>;

type _StrictSpaceClientReturn = ReturnType<_StrictCtx["spaceClient"]>;
type _AssertStrictSpaceClientIsManagerClient = Assert<IsAssignable<ManagerClient, _StrictSpaceClientReturn>>;

// Direct members are API-owned stubs
type _StrictHub = _StrictCtx["hub"];
type _AssertStrictHubIsHostClient = Assert<IsAssignable<HostClient, _StrictHub>>;

type _StrictSpace = _StrictCtx["space"];
type _AssertStrictSpaceIsManagerClient = Assert<IsAssignable<ManagerClient, _StrictSpace>>;

type _StrictApi = _StrictCtx["api"];
type _AssertStrictApiIsAPIExpose = Assert<IsAssignable<APIExpose, _StrictApi>>;

// =============================================================================
// Variable-based assignability checks using declare const
// =============================================================================

// Old AppContext values are assignable to BaseAppContext and SequenceAppContext:
declare const _oldCtx: AppContext<AppConfig, any>;
const _baseCtx: BaseAppContext<AppConfig, any> = _oldCtx;
const _seqCtx: SequenceAppContext<AppConfig, any> = _oldCtx;
