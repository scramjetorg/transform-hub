[@scramjet/types](../README.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

- [*ILifeCycleAdapterMain*](ilifecycleadaptermain.md)

  ↳ **ILifeCycleAdapterRun**

## Table of contents

### Methods

- [cleanup](ilifecycleadapterrun.md#cleanup)
- [hookCommunicationHandler](ilifecycleadapterrun.md#hookcommunicationhandler)
- [init](ilifecycleadapterrun.md#init)
- [monitorRate](ilifecycleadapterrun.md#monitorrate)
- [remove](ilifecycleadapterrun.md#remove)
- [run](ilifecycleadapterrun.md#run)
- [snapshot](ilifecycleadapterrun.md#snapshot)
- [stats](ilifecycleadapterrun.md#stats)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<void\>

Removes resources.

**Returns:** *MaybePromise*<void\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:26](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L26)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: [*ICommunicationHandler*](icommunicationhandler.md)): *MaybePromise*<void\>

Hooks up downstream streams.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `communicationHandler` | [*ICommunicationHandler*](icommunicationhandler.md) | CommunicationHandler |

**Returns:** *MaybePromise*<void\>

Defined in: [packages/types/src/lifecycle-adapters.ts:70](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L70)

___

### init

▸ **init**(): *MaybePromise*<void\>

Initializes Lifecycle adapter.

**Returns:** *MaybePromise*<void\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:21](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L21)

___

### monitorRate

▸ **monitorRate**(`rps`: *number*): [*ILifeCycleAdapterRun*](ilifecycleadapterrun.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `rps` | *number* |

**Returns:** [*ILifeCycleAdapterRun*](ilifecycleadapterrun.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:72](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L72)

___

### remove

▸ **remove**(): *MaybePromise*<void\>

**Returns:** *MaybePromise*<void\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:29](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L29)

___

### run

▸ **run**(`config`: [*RunnerConfig*](../README.md#runnerconfig)): *Promise*<number\>

Starts Runner.

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [*RunnerConfig*](../README.md#runnerconfig) |

**Returns:** *Promise*<number\>

Runner exit code.

Defined in: [packages/types/src/lifecycle-adapters.ts:56](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L56)

___

### snapshot

▸ **snapshot**(): *MaybePromise*<string\>

Request snapshot and returns snapshot url.\

**Returns:** *MaybePromise*<string\>

snapshot url.

Defined in: [packages/types/src/lifecycle-adapters.ts:63](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L63)

___

### stats

▸ **stats**(`msg`: [*MonitoringMessageData*](../README.md#monitoringmessagedata)): *Promise*<[*MonitoringMessageData*](../README.md#monitoringmessagedata)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | [*MonitoringMessageData*](../README.md#monitoringmessagedata) |

**Returns:** *Promise*<[*MonitoringMessageData*](../README.md#monitoringmessagedata)\>

Defined in: [packages/types/src/lifecycle-adapters.ts:74](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/8f44413a/packages/types/src/lifecycle-adapters.ts#L74)
