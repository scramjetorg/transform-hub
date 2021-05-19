[@scramjet/types](../README.md) / ILifeCycleAdapterRun

# Interface: ILifeCycleAdapterRun

## Hierarchy

* [*ILifeCycleAdapterMain*](ilifecycleadaptermain.md)

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

▸ **cleanup**(): *MaybePromise*<*void*\>

Removes resources.

**Returns:** *MaybePromise*<*void*\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:37](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L37)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: [*ICommunicationHandler*](icommunicationhandler.md)): *MaybePromise*<*void*\>

Hooks up downstream streams.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`communicationHandler` | [*ICommunicationHandler*](icommunicationhandler.md) | CommunicationHandler    |

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle-adapters.ts:75](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L75)

___

### init

▸ **init**(): *MaybePromise*<*void*\>

Initializes Lifecycle adapter.

**Returns:** *MaybePromise*<*void*\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:32](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L32)

___

### monitorRate

▸ **monitorRate**(`rps`: *number*): [*ILifeCycleAdapterRun*](ilifecycleadapterrun.md)

#### Parameters:

Name | Type |
------ | ------ |
`rps` | *number* |

**Returns:** [*ILifeCycleAdapterRun*](ilifecycleadapterrun.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:77](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L77)

___

### remove

▸ **remove**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Inherited from: [ILifeCycleAdapterMain](ilifecycleadaptermain.md)

Defined in: [packages/types/src/lifecycle-adapters.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L40)

___

### run

▸ **run**(`config`: [*RunnerConfig*](../README.md#runnerconfig)): *Promise*<*number*\>

Starts Runner.

#### Parameters:

Name | Type |
------ | ------ |
`config` | [*RunnerConfig*](../README.md#runnerconfig) |

**Returns:** *Promise*<*number*\>

Runner exit code.

Defined in: [packages/types/src/lifecycle-adapters.ts:61](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L61)

___

### snapshot

▸ **snapshot**(): *MaybePromise*<*string*\>

Request snapshot and returns snapshot url.\

**Returns:** *MaybePromise*<*string*\>

snapshot url.

Defined in: [packages/types/src/lifecycle-adapters.ts:68](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L68)

___

### stats

▸ **stats**(`msg`: MonitoringMessageData): *Promise*<MonitoringMessageData\>

#### Parameters:

Name | Type |
------ | ------ |
`msg` | MonitoringMessageData |

**Returns:** *Promise*<MonitoringMessageData\>

Defined in: [packages/types/src/lifecycle-adapters.ts:79](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/966a05e/packages/types/src/lifecycle-adapters.ts#L79)
