[@scramjet/types](../README.md) / ILifeCycleAdapterMain

# Interface: ILifeCycleAdapterMain

## Hierarchy

- **`ILifeCycleAdapterMain`**

  ↳ [`ILifeCycleAdapterIdentify`](ilifecycleadapteridentify.md)

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

[packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/lifecycle-adapters.ts#L26)

___

### init

▸ **init**(): `MaybePromise`<`void`\>

Initializes Lifecycle adapter.

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/lifecycle-adapters.ts#L21)

___

### remove

▸ **remove**(): `MaybePromise`<`void`\>

#### Returns

`MaybePromise`<`void`\>

#### Defined in

[packages/types/src/lifecycle-adapters.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/d294535a/packages/types/src/lifecycle-adapters.ts#L29)
