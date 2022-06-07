[@scramjet/types](../README.md) / [Exports](../modules.md) / ILifeCycleAdapterMain

# Interface: ILifeCycleAdapterMain

## Hierarchy

- **`ILifeCycleAdapterMain`**

  ↳ [`ILifeCycleAdapterRun`](ILifeCycleAdapterRun.md)

## Table of contents

### Methods

- [cleanup](ILifeCycleAdapterMain.md#cleanup)
- [getCrashLog](ILifeCycleAdapterMain.md#getcrashlog)
- [init](ILifeCycleAdapterMain.md#init)
- [remove](ILifeCycleAdapterMain.md#remove)

### Properties

- [logger](ILifeCycleAdapterMain.md#logger)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

Removes resources.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:20](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L20)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:25](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L25)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:15](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L15)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:23](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L23)

## Properties

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:10](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L10)
