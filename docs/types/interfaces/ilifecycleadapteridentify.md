[@scramjet/types](../README.md) / ILifeCycleAdapterIdentify

# Interface: ILifeCycleAdapterIdentify

## Hierarchy

- [*ILifeCycleAdapterMain*](ilifecycleadaptermain.md)

  ↳ **ILifeCycleAdapterIdentify**

## Table of contents

### Methods

- [cleanup](ilifecycleadapteridentify.md#cleanup)
- [identify](ilifecycleadapteridentify.md#identify)
- [init](ilifecycleadapteridentify.md#init)
- [list](ilifecycleadapteridentify.md#list)
- [remove](ilifecycleadapteridentify.md#remove)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<void\>

Removes resources.

**Returns:** *MaybePromise*<void\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L26)

___

### identify

▸ **identify**(`stream`: *Readable*, `id`: *string*): *Promise*<[*RunnerConfig*](../README.md#runnerconfig)\>

Passes stream to PreRunner and resolves with PreRunner's results.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | *Readable* | Stream with package. |
| `id` | *string* | - |

**Returns:** *Promise*<[*RunnerConfig*](../README.md#runnerconfig)\>

Defined in: [packages/types/src/lifecycle-adapters.ts:46](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L46)

___

### init

▸ **init**(): *MaybePromise*<void\>

Initializes Lifecycle adapter.

**Returns:** *MaybePromise*<void\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L21)

___

### list

▸ **list**(): *Promise*<[*RunnerConfig*](../README.md#runnerconfig)[]\>

Identifies exising sequences

**Returns:** *Promise*<[*RunnerConfig*](../README.md#runnerconfig)[]\>

found packages

Defined in: [packages/types/src/lifecycle-adapters.ts:39](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L39)

___

### remove

▸ **remove**(): *MaybePromise*<void\>

**Returns:** *MaybePromise*<void\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L29)
