[@scramjet/types](../README.md) / ILifeCycleAdapterMain

# Interface: ILifeCycleAdapterMain

## Hierarchy

- **`ILifeCycleAdapterMain`**

  ↳ [`ILifeCycleAdapterRun`](ilifecycleadapterrun.md)

## Table of contents

### Methods

- [cleanup](ilifecycleadaptermain.md#cleanup)
- [init](ilifecycleadaptermain.md#init)
- [remove](ilifecycleadaptermain.md#remove)

## Methods

### cleanup

▸ **cleanup**(): `MaybePromise`<`void`\>

Removes resources.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:21](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L21)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:16](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L16)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:24](https://github.com/scramjetorg/transform-hub/blob/HEAD/packages/types/src/lifecycle-adapters.ts#L24)
