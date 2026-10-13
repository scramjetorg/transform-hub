import type { APIExpose, StrictAppContext } from "@scramjet/api-types";
import type { AppConfig, BaseAppContext } from "@scramjet/runtime-types";
import type {
    ManifestSequenceAPISurface,
    ManifestSequenceAppContext,
    SequenceAPISurface,
    SequenceAppContext,
    SequenceApplicationInterface
} from "@scramjet/sequence-types";
import type { AppContext } from "@scramjet/types";
import type { ManifestDeclaration, ManifestReceipt } from "@scramjet/runtime-types";

type Assert<T extends true> = T;
type IsAssignable<To, From> = From extends To ? true : false;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type HasDeclare<T> = "declare" extends keyof T ? true : false;

// The manifest-capable author surface remains assignable to existing sequence/base contexts.
type _ManifestContextToSequence = Assert<IsAssignable<SequenceAppContext, ManifestSequenceAppContext>>;
type _ManifestContextToBase = Assert<IsAssignable<BaseAppContext<AppConfig, any>, ManifestSequenceAppContext>>;

// Its declaration method is required and has the shared declaration/receipt contract.
type _DeclareSignature = Assert<
    Equal<ManifestSequenceAPISurface["declare"], (declaration: ManifestDeclaration) => Promise<ManifestReceipt>>
>;
type _DeclareRequired = Assert<{} extends Pick<ManifestSequenceAPISurface, "declare"> ? false : true>;

// All four context generics still bind to their respective members.
type CustomConfig = AppConfig & { feature: string };
type CustomState = { saved: true };
type CustomHub = { hubMarker: true };
type CustomSpace = { spaceMarker: true };
type GenericManifestContext = ManifestSequenceAppContext<CustomConfig, CustomState, CustomHub, CustomSpace>;
type _ConfigGeneric = Assert<Equal<GenericManifestContext["config"], Partial<CustomConfig>>>;
type _StateGeneric = Assert<Equal<GenericManifestContext["initialState"], CustomState | undefined>>;
type _HubGeneric = Assert<Equal<GenericManifestContext["hub"], CustomHub>>;
type _SpaceGeneric = Assert<Equal<GenericManifestContext["space"], CustomSpace>>;

// Old and ordinary contexts do not promise the new declaration API.
type _OldNotManifestContext = Assert<IsAssignable<ManifestSequenceAppContext, AppContext<AppConfig, any>> extends true ? false : true>;
type _PlainNotManifestContext = Assert<IsAssignable<ManifestSequenceAppContext, SequenceAppContext> extends true ? false : true>;
type _SequenceApiHasNoDeclare = Assert<HasDeclare<SequenceAPISurface> extends false ? true : false>;
type _GenericAPIExposeHasNoDeclare = Assert<HasDeclare<APIExpose> extends false ? true : false>;
type _StrictContextHasNoDeclare = Assert<HasDeclare<StrictAppContext<AppConfig, any>["api"]> extends false ? true : false>;

// Existing sequence application function aliases continue to use the ordinary context.
type _ApplicationAliasContext = Assert<
    Equal<ThisParameterType<SequenceApplicationInterface>, SequenceAppContext<AppConfig, any>>
>;
