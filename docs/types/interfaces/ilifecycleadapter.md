[@scramjet/types](../README.md) / ILifeCycleAdapter

# Interface: ILifeCycleAdapter

## Hierarchy

* **ILifeCycleAdapter**

## Table of contents

### Methods

- [cleanup](ilifecycleadapter.md#cleanup)
- [hookCommunicationHandler](ilifecycleadapter.md#hookcommunicationhandler)
- [identify](ilifecycleadapter.md#identify)
- [init](ilifecycleadapter.md#init)
- [monitorRate](ilifecycleadapter.md#monitorrate)
- [remove](ilifecycleadapter.md#remove)
- [run](ilifecycleadapter.md#run)
- [snapshot](ilifecycleadapter.md#snapshot)
- [stats](ilifecycleadapter.md#stats)

## Methods

### cleanup

▸ **cleanup**(): *MaybePromise*<*void*\>

Removes resources.

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle.ts:33](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L33)

___

### hookCommunicationHandler

▸ **hookCommunicationHandler**(`communicationHandler`: [*ICommunicationHandler*](icommunicationhandler.md)): *MaybePromise*<*void*\>

Hooks up downstream streams.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`communicationHandler` | [*ICommunicationHandler*](icommunicationhandler.md) | CommunicationHandler    |

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle.ts:47](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L47)

___

### identify

▸ **identify**(`stream`: *Readable*): *MaybePromise*<[*RunnerConfig*](../README.md#runnerconfig)\>

Passes stream to PreRunner and resolves with PreRunner's results.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`stream` | *Readable* | Stream with package.   |

**Returns:** *MaybePromise*<[*RunnerConfig*](../README.md#runnerconfig)\>

Defined in: [packages/types/src/lifecycle.ts:20](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L20)

___

### init

▸ **init**(): *MaybePromise*<*void*\>

Initializes Lifecycle adapter.

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle.ts:12](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L12)

___

### monitorRate

▸ **monitorRate**(`rps`: *number*): [*ILifeCycleAdapter*](ilifecycleadapter.md)

#### Parameters:

Name | Type |
------ | ------ |
`rps` | *number* |

**Returns:** [*ILifeCycleAdapter*](ilifecycleadapter.md)

Defined in: [packages/types/src/lifecycle.ts:49](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L49)

___

### remove

▸ **remove**(): *MaybePromise*<*void*\>

**Returns:** *MaybePromise*<*void*\>

Defined in: [packages/types/src/lifecycle.ts:52](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L52)

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

Defined in: [packages/types/src/lifecycle.ts:28](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L28)

___

### snapshot

▸ **snapshot**(): *MaybePromise*<*string*\>

Request snapshot and returns snapshot url.\

**Returns:** *MaybePromise*<*string*\>

snapshot url.

Defined in: [packages/types/src/lifecycle.ts:40](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L40)

___

### stats

▸ **stats**(`msg`: MonitoringMessageData): *Promise*<MonitoringMessageData\>

#### Parameters:

Name | Type |
------ | ------ |
`msg` | MonitoringMessageData |

**Returns:** *Promise*<MonitoringMessageData\>

Defined in: [packages/types/src/lifecycle.ts:54](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/61a9cb1/packages/types/src/lifecycle.ts#L54)
