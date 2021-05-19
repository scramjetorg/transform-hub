[@scramjet/types](../README.md) / ILifeCycleAdapterMain

# Interface: ILifeCycleAdapterMain

## Hierarchy

* **ILifeCycleAdapterMain**

  ↳ [*ILifeCycleAdapterIdentify*](ilifecycleadapteridentify.md)

  ↳ [*ILifeCycleAdapterRun*](ilifecycleadapterrun.md)

## Table of contents

### Methods

- [cleanup](ilifecycleadaptermain.md#cleanup)
- [init](ilifecycleadaptermain.md#init)
- [remove](ilifecycleadaptermain.md#remove)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<*void*\>

Removes resources.

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle-adapters.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L37)

___

### init

▸ **init**(): *MaybePromise*<*void*\>

Initializes Lifecycle adapter.

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle-adapters.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L32)

___

### remove

▸ **remove**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle-adapters.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L40)
