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

[packages/types/src/lifecycle-adapters.ts:19](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L19)

___

### getCrashLog

▸ **getCrashLog**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L24)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:14](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L14)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:22](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L22)

## Properties

### logger

• **logger**: [`IObjectLogger`](IObjectLogger.md)

#### Defined in

[packages/types/src/lifecycle-adapters.ts:9](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L9)
