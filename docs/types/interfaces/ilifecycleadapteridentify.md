[@scramjet/types](../README.md) / ILifeCycleAdapterIdentify

# Interface: ILifeCycleAdapterIdentify

## Hierarchy

* [*ILifeCycleAdapterMain*](ilifecycleadaptermain.md)

  ↳ **ILifeCycleAdapterIdentify**

## Table of contents

### Methods

- [cleanup](ilifecycleadapteridentify.md#cleanup)
- [identify](ilifecycleadapteridentify.md#identify)
- [init](ilifecycleadapteridentify.md#init)
- [remove](ilifecycleadapteridentify.md#remove)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<*void*\>

Removes resources.

**Returns:** *MaybePromise*<*void*\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle-adapters.ts#L37)

___

### identify

▸ **identify**(`stream`: *Readable*): *MaybePromise*<[*RunnerConfig*](../README.md#runnerconfig)\>

Passes stream to PreRunner and resolves with PreRunner's results.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`stream` | *Readable* | Stream with package.   |

**Returns:** *MaybePromise*<[*RunnerConfig*](../README.md#runnerconfig)\>

Defined in: [packages/types/src/lifecycle-adapters.ts:51](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle-adapters.ts#L51)

___

### init

▸ **init**(): *MaybePromise*<*void*\>

Initializes Lifecycle adapter.

**Returns:** *MaybePromise*<*void*\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle-adapters.ts#L32)

___

### remove

▸ **remove**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle-adapters.ts#L40)
